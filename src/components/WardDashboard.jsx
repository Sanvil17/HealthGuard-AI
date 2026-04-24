import PatientCard from './PatientCard'

function statusCount(patients, status) {
  return patients.filter((patient) => patient.status === status).length
}

function WardDashboard({ patients, selectedPatientId, onSelectPatient, onAddPatient }) {
  const totalSlots = Math.max(6, patients.length)
  const slots = Array.from({ length: totalSlots }, (_, index) => patients[index] ?? null)

  return (
    <section className="dashboard-panel p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Ward Dashboard</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-green-50 px-2 py-1 font-semibold text-green-600">
            Green: {statusCount(patients, 'green')}
          </span>
          <span className="rounded-full bg-orange-50 px-2 py-1 font-semibold text-orange-500">
            Yellow: {statusCount(patients, 'yellow')}
          </span>
          <span className="rounded-full bg-red-50 px-2 py-1 font-semibold text-red-500">
            Red: {statusCount(patients, 'red')}
          </span>
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={onAddPatient}
          className="dashboard-button px-4 py-2 text-sm font-medium"
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
                className="flex min-h-[126px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-center text-xs text-gray-400"
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
