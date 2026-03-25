import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getCalendarEvents } from '../data/store';
import { X, CalendarDays, AlertCircle, Clock } from 'lucide-react';

export default function PaymentCalendar() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    setEvents(getCalendarEvents());
  }, []);

  const handleEventClick = (info) => {
    setSelectedEvent(info.event.extendedProps);
  };

  const now = new Date();
  const overdue = events.filter((e) => new Date(e.date) < now).length;
  const dueSoon = events.filter((e) => {
    const diff = (new Date(e.date) - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 3;
  }).length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
          <CalendarDays className="w-7 h-7 text-teal-400" />
          Payment Calendar
        </h1>
        <p className="text-sm text-gray-400 mt-1">Track all supplier payment due dates</p>
      </div>

      {/* Legends */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-[#111113] border border-zinc-800 rounded-xl shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-danger-500"></div>
          <span className="text-sm text-gray-300">Overdue ({overdue})</span>
        </div>
        <div className="bg-[#111113] border border-zinc-800 rounded-xl shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-warning-500"></div>
          <span className="text-sm text-gray-300">Due in 3 days ({dueSoon})</span>
        </div>
        <div className="bg-[#111113] border border-zinc-800 rounded-xl shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-teal-500"></div>
          <span className="text-sm text-gray-300">Upcoming</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-[#111113] border border-zinc-800 rounded-xl shadow-sm p-4 lg:p-6">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          eventClick={handleEventClick}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek',
          }}
          height="auto"
          dayMaxEvents={3}
          eventDisplay="block"
        />
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
          <div className="relative w-full max-w-md bg-[#111113] border border-zinc-800 rounded-xl shadow-sm p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Invoice Details</h3>
              <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Supplier</span>
                <span className="text-sm font-semibold text-gray-200">{selectedEvent.supplier?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Purchase Date</span>
                <span className="text-sm text-gray-300">{selectedEvent.purchase?.date}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Due Date</span>
                <span className={`text-sm font-semibold ${new Date(selectedEvent.dueDate) < now ? 'text-danger-400' : 'text-warning-400'}`}>
                  {selectedEvent.dueDate}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Amount</span>
                <span className="text-sm font-bold text-teal-300">₹{selectedEvent.purchase?.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Credit Terms</span>
                <span className="px-2.5 py-1 bg-teal-500/15 text-teal-300 text-xs font-semibold rounded-full">
                  {selectedEvent.supplier?.creditTerms}
                </span>
              </div>
              <hr className="border-gray-800/40" />
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
                {selectedEvent.purchase?.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1.5">
                    <span className="text-gray-300">{item.name} ({item.quantity} {item.unit})</span>
                    <span className="text-gray-400">₹{(item.quantity * item.pricePerUnit).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

