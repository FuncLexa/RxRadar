import SectionHead from '../components/SectionHead'
import SavedPrescriptions from '../components/SavedPrescriptions'

export default function Saved({ onRestorePrescription }) {
  return (
    <div>
      <SectionHead step="B" title="Saved" sub="Your prescriptions and refill reminders, stored locally on this device." />
      <SavedPrescriptions onRestorePrescription={onRestorePrescription} />
    </div>
  )
}
