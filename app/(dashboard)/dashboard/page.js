export default function TailwindTest() {
  return (
    <div className="min-h-screen bg-red-500 flex items-center justify-center">
      <div className="bg-blue-500 p-8 rounded-lg shadow-lg">
        <h1 className="text-white text-4xl font-bold mb-4">TAILWIND TEST</h1>
        <p className="text-yellow-300 text-xl">If you see colors, Tailwind works!</p>
        <div className="mt-4 p-4 bg-green-400 rounded">
          <span className="text-black font-semibold">This should be green with black text</span>
        </div>
      </div>
    </div>
  );
}
