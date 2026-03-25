import { env } from "@github_fin/env/server";
import axios from "axios";
import { Router } from "express";

const router = Router();

function cleanJsonText(text: string) {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

function extractProviderError(error: any) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Unknown provider error"
  );
}

async function generateWithGemini(promptText: string) {
  const geminiKey = env.GEMINI_API_KEY;
  if (!geminiKey) {
    throw new Error("GEMINI_API_KEY is not configured in server environment");
  }

  const modelsReq = await axios.get(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`,
  );
  const availableModel =
    modelsReq.data.models
      .map((m: any) => m.name)
      .find((name: string) => name.includes("gemini-1.5-flash") || name.includes("gemini-2.0-flash")) ||
    "models/gemini-1.5-flash";

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${availableModel}:generateContent?key=${geminiKey}`;
  const response = await axios.post(
    apiUrl,
    {
      contents: [{ parts: [{ text: promptText }] }],
    },
    {
      headers: { "Content-Type": "application/json" },
    },
  );

  const resultText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resultText) {
    throw new Error("Invalid response from Gemini API");
  }

  return cleanJsonText(resultText);
}

async function generateWithGroq(promptText: string) {
  const groqKey = env.GROQ_API_KEY;
  if (!groqKey) {
    throw new Error("GROQ_API_KEY is not configured in server environment");
  }

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: env.GROQ_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "Return only valid JSON with no markdown fences.",
        },
        {
          role: "user",
          content: promptText,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  const resultText = response.data?.choices?.[0]?.message?.content;
  if (!resultText) {
    throw new Error("Invalid response from Groq API");
  }

  return cleanJsonText(resultText);
}

async function generateJsonWithFallback(promptText: string) {
  try {
    const text = await generateWithGroq(promptText);
    return { text, provider: "groq" as const };
  } catch (groqError: any) {
    const groqMsg = extractProviderError(groqError);
    console.warn(`Groq failed, trying Gemini fallback: ${groqMsg}`);

    try {
      const text = await generateWithGemini(promptText);
      return { text, provider: "gemini" as const };
    } catch (geminiError: any) {
      const geminiMsg = extractProviderError(geminiError);
      throw new Error(`Groq failed: ${groqMsg}. Gemini fallback failed: ${geminiMsg}`);
    }
  }
}

router.get("/", (_req, res) => {
  res.send("Instagram Analyzer Backend is running.");
});

router.post("/analyze-instagram", async (req, res) => {
  try {
    const { instagram_url } = req.body;

    if (!instagram_url) {
      return res.status(400).json({ success: false, error: "Instagram URL is required" });
    }

    // Extract username from URL safely
    let username = instagram_url.replace(/\/$/, "").split("/").pop();
    if (username.includes("?")) username = username.split("?")[0];

    // Fetch actual Instagram details using Public Meta App API
    let user;
    try {
      const igResponse = await axios.get(
        `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
            "X-IG-App-ID": "936619743392459",
          },
        },
      );

      user = igResponse.data?.data?.user;
      if (!user) {
        throw new Error("Instagram API blocked the request or user not found.");
      }
    } catch (igError: any) {
      console.error("Failed to scrape IG directly:", igError.message);
      throw new Error(`Could not fetch details for Instagram page: ${username}. It may be private or invalid.`);
    }

    const bio = user.biography || "No biography available.";
    const followers = user.edge_followed_by?.count || 0;
    const name = user.full_name || username;

    let captions: string[] = [];
    let recentPosts: any[] = [];
    const edgeMedia = user.edge_owner_to_timeline_media?.edges || [];
    for (let edge of edgeMedia) {
      const node = edge.node;
      const captionEdge = node?.edge_media_to_caption?.edges?.[0];
      const text = captionEdge?.node?.text || "";

      if (text) {
        captions.push(text.replace(/\n/g, " "));
      }

      recentPosts.push({
        imageUrl: `/api/insta/proxy-media?url=${encodeURIComponent(node?.display_url || "")}`,
        videoUrl: node?.is_video
          ? `/api/insta/proxy-media?url=${encodeURIComponent(node?.video_url || "")}`
          : null,
        caption: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
        isVideo: node?.is_video || false,
        link: `https://www.instagram.com/p/${node?.shortcode}/`,
      });
    }

    const textData = `Name: ${name}\nBio: ${bio}\nRecent Posts: ${captions.slice(0, 6).join(" | ")}`;

    const promptText = `Analyze this Instagram business based on its bio, name, and recent content.
Determine what could be its "Current Followers", "Product Categories", "Business Type", and "Summary".

Return JSON ONLY in this format:
{
  "summary": "...",
  "businessType": "...",
  "productCategories": "...",
  "currentFollowers": "${Number(followers).toLocaleString()} Followers"
}

Content to analyze:
${textData}`;

    const { text: resultText, provider } = await generateJsonWithFallback(promptText);

    let parsedJsonFromAi: any;
    try {
      parsedJsonFromAi = JSON.parse(resultText);
      // Explicitly override the follower count directly from our scraper to avoid Gemini hallucinating it!
      parsedJsonFromAi.currentFollowers = `${Number(followers).toLocaleString()} Followers`;
      // Add precisely scraped posts payload
      parsedJsonFromAi.recentPosts = recentPosts.slice(0, 6);
    } catch (parseError) {
      console.error("AI parse failed:", resultText);
      throw new Error("AI provider did not return valid JSON format");
    }

    return res.json({
      success: true,
      data: parsedJsonFromAi,
      provider,
    });
  } catch (error: any) {
    let msg = "Failed to analyze data via AI providers";
    if (error.response && error.response.data && error.response.data.error) {
      msg = error.response.data.error.message;
    } else if (error.message) {
      msg = error.message;
    }
    res.status(500).json({
      success: false,
      error: msg,
    });
  }
});

// ─── Business Profile Generator ───────────────────────────────────────────
router.post("/generate-business-profile", async (req, res) => {
  try {
    const { instagram_url, manualData } = req.body;

    let textData = "";
    let instagramPosts: any[] = [];

    if (instagram_url && instagram_url.trim()) {
      // Scrape Instagram like the main analyzer
      let username = instagram_url.replace(/\/$/, "").split("/").pop();
      if (username.includes("?")) username = username.split("?")[0];

      try {
        const igResponse = await axios.get(
          `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
              "X-IG-App-ID": "936619743392459",
            },
          },
        );

        const user = igResponse.data?.data?.user;
        if (user) {
          const bio = user.biography || "";
          const name = user.full_name || username;
          const followers = user.edge_followed_by?.count || 0;
          const captions: string[] = [];
          const mediaEdges = user.edge_owner_to_timeline_media?.edges || [];

          for (let edge of mediaEdges) {
            const node = edge.node;
            const captionEdge = node?.edge_media_to_caption?.edges?.[0];
            const text = captionEdge?.node?.text || "";
            if (text) captions.push(text.replace(/\n/g, " "));
            instagramPosts.push({
              imageUrl: `/api/insta/proxy-media?url=${encodeURIComponent(node?.display_url || "")}`,
              videoUrl: node?.is_video
                ? `/api/insta/proxy-media?url=${encodeURIComponent(node?.video_url || "")}`
                : null,
              caption: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
              isVideo: node?.is_video || false,
              link: `https://www.instagram.com/p/${node?.shortcode}/`,
            });
          }

          textData = `Name: ${name}\nBio: ${bio}\nFollowers: ${followers}\nRecent Posts: ${captions.slice(0, 6).join(" | ")}`;
        }
      } catch (igErr: any) {
        console.warn("Instagram scrape failed for profile setup, using manual data fallback:", igErr.message);
      }
    }

    // Merge manual data on top
    if (manualData) {
      const parts: string[] = [];
      if (manualData.businessName) parts.push(`Business Name: ${manualData.businessName}`);
      if (manualData.description) parts.push(`Description: ${manualData.description}`);
      if (manualData.products) parts.push(`Products/Services: ${manualData.products}`);
      if (manualData.sellingMethod) parts.push(`Selling Method: ${manualData.sellingMethod}`);
      if (manualData.locationType) parts.push(`Location Type: ${manualData.locationType}`);
      if (parts.length > 0) {
        textData = textData ? `${textData}\n\nManual Additions:\n${parts.join("\n")}` : parts.join("\n");
      }
    }

    if (!textData.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please provide an Instagram URL or fill in manual business details.",
      });
    }

    const lang = manualData?.language || "English";

    const promptText = `Analyze this business information and generate a complete business profile.
Language instruction: Respond in ${lang}. If the input contains Hindi or Hinglish, respond in the same language for summary and descriptions.

Return a single JSON object ONLY (no markdown, no explanation):
{
  "summary": "",
  "businessType": "",
  "products": "",
  "targetAudience": "",
  "sellingMethod": "",
  "businessSize": "",
  "estimatedAnnualIncome": "",
  "growthStage": "",
  "locationType": "",
  "pricingLevel": "",
  "confidenceScore": ""
}

Rules:
- Infer missing fields intelligently based on context
- Keep answers realistic for small/medium Indian businesses
- estimatedAnnualIncome should be a realistic range in INR
- confidenceScore should be a percentage like "82%"
- Keep summary simple, clear, and 2-3 sentences max

Business Data:
${textData}`;

    const { text: resultText, provider } = await generateJsonWithFallback(promptText);

    let profile: any;
    try {
      profile = JSON.parse(resultText);
    } catch {
      console.error("AI parse failed:", resultText);
      throw new Error("AI did not return valid JSON. Please try again.");
    }

    // Attach Instagram posts if scraped
    profile.instagramPosts = instagramPosts.slice(0, 6);
    profile.aiProvider = provider;

    return res.json({ success: true, data: profile });
  } catch (error: any) {
    let msg = error.message || "Failed to generate business profile";
    if (error.response?.data?.error?.message) msg = error.response.data.error.message;
    console.error("Profile generation error:", msg);
    res.status(500).json({ success: false, error: msg });
  }
});

// ─── Business Profile Storage (No AI) ──────────────────────────────────────
const businessProfiles: any[] = []; // in-memory store

router.post("/save-business-profile", (req, res) => {
  const data = req.body;
  if (!data || !data.businessName) {
    return res.status(400).json({ success: false, error: "Business name is required." });
  }
  const profile = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    ...data,
  };
  businessProfiles.unshift(profile); // newest first
  console.log("Saved business profile:", profile.businessName);
  return res.json({
    success: true,
    message: "Business profile saved successfully",
    data: profile,
  });
});

router.get("/get-business-profiles", (_req, res) => {
  return res.json({ success: true, data: businessProfiles });
});

router.get("/get-business-profile/:id", (req, res) => {
  const found = businessProfiles.find((p) => p.id === req.params.id);
  if (!found) return res.status(404).json({ success: false, error: "Profile not found." });
  return res.json({ success: true, data: found });
});

router.put("/update-business-profile/:id", (req, res) => {
  const idx = businessProfiles.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Profile not found." });
  businessProfiles[idx] = { ...businessProfiles[idx], ...req.body, id: businessProfiles[idx].id };
  return res.json({ success: true, message: "Profile updated", data: businessProfiles[idx] });
});

router.get("/proxy-media", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("No URL provided");
  try {
    const igMedia = await axios.get(url as string, {
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
        Referer: "https://www.instagram.com/",
      },
    });
    res.setHeader("Content-Type", igMedia.headers["content-type"] || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    igMedia.data.pipe(res);
  } catch (e: any) {
    console.error("Proxy error:", e.message);
    res.status(500).send("Failed to proxy media");
  }
});

export default router;
