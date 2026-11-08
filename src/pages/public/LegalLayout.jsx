export default function LegalLayout({ title, updated, children }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
      <p className="mb-6 text-sm text-gray-500">Última actualización: {updated}</p>
      <div className="prose prose-sm max-w-none text-gray-700 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-900 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-blue-600 [&_a]:underline" style={{ overflowWrap: 'break-word' }}>
        {children}
      </div>
    </div>
  )
}