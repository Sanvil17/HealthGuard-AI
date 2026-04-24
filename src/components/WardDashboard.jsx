import PatientCard from './PatientCard'

function statusCount(patients, status) {
  return patients.filter((patient) => patient.status === status).length
}

function WardDashboard({ patients, selectedPatientId, onSelectPatient, onAddPatient }) {
  const totalSlots = Math.max(6, patients.length)
  const slots = Array.from({ length: totalSlots }, (_, index) => patients[index] ?? null)

  return (
    <section className="dashboard-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Ward Overview</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {statusCount(patients, 'green')}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            {statusCount(patients, 'yellow')}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-600">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            {statusCount(patients, 'red')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {slots.map((patient, index) => {
          if (!patient) {
            return (
              <div
                key={`empty-${index}`}
                className="flex min-h-[100px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 text-center text-xs text-gray-400"
              >
                Empty Slot
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
