import { Card } from "@/components/ui/card";

export default function CommingSoon() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black/95">
      <Card className="relative w-full max-w-4xl mx-4 overflow-hidden rounded-lg shadow-xl">
        <video autoPlay playsInline loop className="w-full h-full object-cover">
          <source src="/comming-soon.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        {/*
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 text-center">
            Coming Soon
          </h1>
          <p className="text-lg md:text-xl text-white/90 text-center px-6">
            We're working hard to bring you something amazing. Stay tuned!
          </p>
        </div>
        */}
      </Card>
    </div>
  );
}