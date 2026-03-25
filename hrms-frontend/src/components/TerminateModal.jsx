export default function TerminateModal({ analyst, onClose, onConfirm }) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-lg font-semibold mb-4">
          Terminate {analyst.name}
        </h2>

        <textarea
          placeholder="Termination reason"
          className="border w-full p-2 rounded mb-4"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Terminate
          </button>
        </div>
      </div>
    </div>
  );
}
