import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { mockDoctors } from "@/lib/mockData";
import { CalendarDays, Star, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import Disclaimer from "@/components/Disclaimer";

export default function AppointmentsPage() {
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);

  const doctor = mockDoctors.find((d) => d.id === selectedDoctor);

  const handleBook = () => {
    if (!doctor || !selectedDate || !selectedTime) {
      toast.error("Please select a doctor, date, and time");
      return;
    }
    setBooked(true);
    toast.success("Appointment booked successfully!");
  };

  if (booked && doctor) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto text-center space-y-4 py-12">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-display font-bold">Appointment Confirmed!</h1>
          <div className="health-card text-left space-y-2">
            <p className="text-sm"><strong>Doctor:</strong> {doctor.name}</p>
            <p className="text-sm"><strong>Specialization:</strong> {doctor.specialization}</p>
            <p className="text-sm"><strong>Date:</strong> {selectedDate?.toLocaleDateString()}</p>
            <p className="text-sm"><strong>Time:</strong> {selectedTime}</p>
          </div>
          <Disclaimer />
          <Button onClick={() => { setBooked(false); setSelectedDoctor(null); setSelectedDate(undefined); setSelectedTime(null); }}>
            Book Another
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" /> Book Appointment
          </h1>
          <p className="text-muted-foreground text-sm">Choose a doctor and schedule your visit</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Doctor List */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-display font-semibold">Select a Doctor</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {mockDoctors.map((d) => (
                <button
                  key={d.id}
                  onClick={() => { setSelectedDoctor(d.id); setSelectedTime(null); }}
                  className={`health-card text-left transition-all ${selectedDoctor === d.id ? "ring-2 ring-primary border-primary/30" : ""}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {d.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.specialization}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Star className="h-3 w-3 text-warning" /> {d.rating}</span>
                    <span>{d.experience}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Booking Panel */}
          <div className="space-y-4">
            <div className="health-card">
              <h3 className="font-display font-semibold mb-3">Select Date</h3>
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="mx-auto" disabled={(date) => date < new Date()} />
            </div>

            {doctor && (
              <div className="health-card">
                <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Available Slots
                </h3>
                <div className="flex flex-wrap gap-2">
                  {doctor.availability.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        selectedTime === t ? "bg-primary text-primary-foreground border-primary" : "hover:border-primary/50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleBook} size="lg" className="w-full" disabled={!doctor || !selectedDate || !selectedTime}>
              Confirm Booking
            </Button>
          </div>
        </div>

        <Disclaimer />
      </div>
    </DashboardLayout>
  );
}
