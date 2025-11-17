export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          DropSpot
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Limited Stock & Waitlist Platform
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/drops"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Browse Drops
          </a>
          <a
            href="/auth/login"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            Login
          </a>
        </div>
      </div>
    </main>
  )
}
