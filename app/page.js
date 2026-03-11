import { Suspense } from "react";
import HomeClient from "./home-client";

export default function Page() {
  return (
    <Suspense fallback={<div className="container"><h1>Scan2Sustain</h1></div>}>
      <HomeClient />
    </Suspense>
  );
}

