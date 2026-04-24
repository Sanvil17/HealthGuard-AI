import PatientCard from './PatientCard'

function statusCount(patients, status) {
  return patients.filter((patient) => patient.status === status).length
}

function WardDashboard({ patients, selectedPatientId, onSelectPatient }) {
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-app-panel p-4 shadow-lg shadow-black/30">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Ward Dashboard</h2>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-emerald-300">
            Green: {statusCount(patients, 'green')}
          </span>
          <span className="rounded-full bg-amber-500/20 px-2 py-1 text-amber-300">
            Yellow: {statusCount(patients, 'yellow')}
          </span>
          <span className="rounded-full bg-rose-500/20 px-2 py-1 text-rose-300">
            Red: {statusCount(patients, 'red')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {patients.map((patient) => (
          <PatientCard
            key={patient.id}
            patient={patient}
            selected={patient.id === selectedPatientId}
            onSelect={() => onSelectPatient(patient.id)}
          />
        ))}
      </div>
    </section>
  )
}

export default WardDashboard
