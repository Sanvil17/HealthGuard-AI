import PatientCard from './PatientCard'

function statusCount(patients, status) {
  return patients.filter((patient) => patient.status === status).length
}

function WardDashboard({ patients, selectedPatientId, onSelectPatient, onAddPatient }) {
  const totalSlots = Math.max(6, patients.length)
  const slots = Array.from({ length: totalSlots }, (_, index) => patients[index] ?? null)

  return (
    <section className="rounded-2xl border border-slate-700/70 bg-app-panel/95 p-4 shadow-2xl shadow-black/35">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-white lg:text-xl">Ward Dashboard</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-[#22C55E]/20 px-2 py-1 font-semibold text-[#B9F8CC]">
            Green: {statusCount(patients, 'green')}
          </span>
          <span className="rounded-full bg-[#F5A623]/20 px-2 py-1 font-semibold text-[#FFE4B2]">
            Yellow: {statusCount(patients, 'yellow')}
          </span>
          <span className="rounded-full bg-[#EF4444]/20 px-2 py-1 font-semibold text-[#FFD0D0]">
            Red: {statusCount(patients, 'red')}
          </span>
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={onAddPatient}
          className="rounded-lg border border-cyan-300/60 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
        >
          Add Patient
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {slots.map((patient, index) => {
          if (!patient) {
            return (
              <div
                key={`empty-${index}`}
                className="flex min-h-[126px] items-center justify-center rounded-xl border border-dashed border-slate-600/70 bg-slate-900/35 text-center text-xs text-slate-400"
              >
                Empty Slot {index + 1}
              </div>
            )
          }

          return (
            <PatientCard
              key={patient.id}
              patient={patient}
              selected={patient.id === selectedPatientId}
              onSelect={() => onSelectPatient(patient.id)}
            />
          )
        })}
      </div>
    </section>
  )
}

export default WardDashboard
