export default function Docs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">API Documentation</h1>
        <p className="mt-1.5 text-sm text-gray-500">Explore interactive Swagger references and try live request patterns.</p>
      </div>

      <div className="h-[75vh] w-full bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
        <iframe 
          src="http://localhost:3000/docs" 
          className="w-full h-full border-none"
          title="Village API Interactive Documentation"
        />
      </div>
    </div>
  );
}
