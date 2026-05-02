export default function ImpactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="font-bold text-xl text-emerald-700">Waste to Worth</span>
          <a href="/" className="text-gray-600 hover:text-emerald-600">&larr; Back to Home</a>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Impact Dashboard</h1>
        <p className="text-gray-600 mb-8">Real-time e-waste collection impact in Makassar</p>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <p className="text-3xl font-bold text-emerald-600">&mdash;</p>
            <p className="text-gray-500 text-sm mt-1">Total E-Waste (kg)</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <p className="text-3xl font-bold text-emerald-600">&mdash;</p>
            <p className="text-gray-500 text-sm mt-1">Contributors</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <p className="text-3xl font-bold text-emerald-600">&mdash;</p>
            <p className="text-gray-500 text-sm mt-1">Submissions</p>
          </div>
        </div>
      </main>
    </div>
  );
}
