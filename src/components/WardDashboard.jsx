import { useMemo } from 'react'
import PatientCard from './PatientCard'

function statusCount(patients, status) {
  return patients.filter((patient) => patient.status === status).length
}

const filterMeta = {
  all: {
    label: 'All',
    active: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  },
  green: {
    label: 'Stable',
    active: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  },
  yellow: {
    label: 'Warning',
    active: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200',
  },
  red: {
    label: 'Critical',
    active: 'bg-red-50 text-red-600 ring-1 ring-red-200',
  },
}

function WardDashboard({
  patients,
  filteredPatients,
  activeFilter,
  onFilterChange,
  selectedPatientId,
  onSelectPatient,
  onAddPatient,
}) {
  const counts = useMemo(() => {
    return {
      all: patients.length,
      green: statusCount(patients, 'green'),
      yellow: statusCount(patients, 'yellow'),
      red: statusCount(patients, 'red'),
    }
  }, [patients])

  const totalSlots = activeFilter === 'all' ? Math.max(6, filteredPatients.length) : filteredPatients.length
  const slots = activeFilter === 'all'
    ? Array.from({ length: totalSlots }, (_, index) => filteredPatients[index] ?? null)
    : filteredPatients

  const filterButtons = ['all', 'green', 'yellow', 'red']

  return (
    <section className="dashboard-panel p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Ward Dashboard</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {filterButtons.map((filterKey) => {
            const isActive = filterKey === activeFilter
            const meta = filterMeta[filterKey]

            return (
              <button
                key={filterKey}
                type="button"
                onClick={() => onFilterChange(filterKey)}
                className={`rounded-full px-2.5 py-1 font-semibold transition ${isActive
                  ? meta.active
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {meta.label}: {counts[filterKey]}
              </button>
            )
          })}
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

      {slots.length === 0 ? (
        <div className="flex min-h-[126px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-center text-sm text-gray-500">
          No patients in {filterMeta[activeFilter].label} condition.
        </div>
      ) : (
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
      )}
    </section>
  )
}

export default WardDashboard
