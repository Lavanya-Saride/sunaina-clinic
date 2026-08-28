export default function FeedbackSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-white border border-line rounded-2xl p-6 animate-pulse">
          <div className="h-5 w-24 bg-line rounded-full mb-4" />
          <div className="h-3 w-full bg-line rounded mb-2" />
          <div className="h-3 w-5/6 bg-line rounded mb-2" />
          <div className="h-3 w-2/3 bg-line rounded mb-6" />
          <div className="flex items-center gap-3 pt-4 border-t border-line">
            <div className="w-9 h-9 rounded-full bg-line" />
            <div className="h-3 w-24 bg-line rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
