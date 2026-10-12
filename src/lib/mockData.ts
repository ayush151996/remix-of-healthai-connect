export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  height: string;
  weight: string;
  bloodGroup: string;
  pastSurgeries: string;
  surgeryTimeline: string;
  existingDiseases: string;
  allergies: string;
  phone: string;
  email: string;
  registeredDate: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  rating: number;
  availability: string[];
  avatar: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  date: string;
  time: string;
  status: "scheduled" | "completed" | "cancelled";
}

export const mockDoctors: Doctor[] = [
  { id: "d1", name: "Dr. Sarah Mitchell", specialization: "Cardiologist", experience: "15 years", rating: 4.9, availability: ["9:00 AM", "10:00 AM", "2:00 PM", "4:00 PM"], avatar: "SM" },
  { id: "d2", name: "Dr. James Chen", specialization: "Neurologist", experience: "12 years", rating: 4.8, availability: ["10:00 AM", "11:00 AM", "3:00 PM"], avatar: "JC" },
  { id: "d3", name: "Dr. Priya Sharma", specialization: "Dermatologist", experience: "8 years", rating: 4.7, availability: ["9:00 AM", "11:00 AM", "1:00 PM", "5:00 PM"], avatar: "PS" },
  { id: "d4", name: "Dr. Michael Brown", specialization: "Orthopedic", experience: "20 years", rating: 4.9, availability: ["10:00 AM", "2:00 PM", "4:00 PM"], avatar: "MB" },
  { id: "d5", name: "Dr. Emily Rodriguez", specialization: "Pediatrician", experience: "10 years", rating: 4.8, availability: ["9:00 AM", "12:00 PM", "3:00 PM"], avatar: "ER" },
  { id: "d6", name: "Dr. David Kim", specialization: "General Physician", experience: "18 years", rating: 4.6, availability: ["9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM"], avatar: "DK" },
];

export const mockPatients: Patient[] = [
  { id: "p1", name: "John Doe", age: 34, gender: "Male", height: "5'10\"", weight: "75 kg", bloodGroup: "O+", pastSurgeries: "Appendectomy", surgeryTimeline: "2019", existingDiseases: "None", allergies: "Penicillin", phone: "+1 555-0123", email: "john@example.com", registeredDate: "2024-01-15" },
  { id: "p2", name: "Jane Smith", age: 28, gender: "Female", height: "5'5\"", weight: "60 kg", bloodGroup: "A+", pastSurgeries: "None", surgeryTimeline: "N/A", existingDiseases: "Asthma", allergies: "Dust, Pollen", phone: "+1 555-0456", email: "jane@example.com", registeredDate: "2024-02-20" },
  { id: "p3", name: "Robert Wilson", age: 52, gender: "Male", height: "5'11\"", weight: "88 kg", bloodGroup: "B+", pastSurgeries: "Knee Replacement", surgeryTimeline: "2021", existingDiseases: "Diabetes Type 2, Hypertension", allergies: "None", phone: "+1 555-0789", email: "robert@example.com", registeredDate: "2024-03-10" },
];

export const mockAppointments: Appointment[] = [
  { id: "a1", patientId: "p1", patientName: "John Doe", doctorId: "d1", doctorName: "Dr. Sarah Mitchell", specialization: "Cardiologist", date: "2024-12-20", time: "10:00 AM", status: "scheduled" },
  { id: "a2", patientId: "p2", patientName: "Jane Smith", doctorId: "d3", doctorName: "Dr. Priya Sharma", specialization: "Dermatologist", date: "2024-12-18", time: "11:00 AM", status: "completed" },
  { id: "a3", patientId: "p3", patientName: "Robert Wilson", doctorId: "d4", doctorName: "Dr. Michael Brown", specialization: "Orthopedic", date: "2024-12-22", time: "2:00 PM", status: "scheduled" },
  { id: "a4", patientId: "p1", patientName: "John Doe", doctorId: "d6", doctorName: "Dr. David Kim", specialization: "General Physician", date: "2024-11-15", time: "9:00 AM", status: "completed" },
];
