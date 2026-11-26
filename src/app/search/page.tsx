import { serverFetch } from "@/lib/api-server";
import Link from "next/link";
import Image from "next/image";
import { getMediaUrl } from "@/lib/runtime-config";

function normalizeSearchResults(payload: any): { cars: any[]; parts: any[] } {
  const container = payload?.results && typeof payload.results === "object" ? payload.results : payload;
  return {
    cars: Array.isArray(container?.cars) ? container.cars : [],
    parts: Array.isArray(container?.parts) ? container.parts : [],
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q || "";
  let cars = [];
  let parts = [];

  if (query) {
    try {
      const res = await serverFetch(`/dashboard/search/?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search is temporarily unavailable.");
      const data = await res.json();
      if (data && !data.error) {
        const normalized = normalizeSearchResults(data);
        cars = normalized.cars;
        parts = normalized.parts;
      }
    } catch {
      throw new Error("Search is temporarily unavailable. Please try again.");
    }
  }

  return (
    <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto min-h-screen">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter headline mb-2">
        Search Results
      </h1>
      <p className="text-on-surface-variant mb-12">
        Showing results for &quot;<span className="font-bold text-on-surface">{query}</span>&quot;
      </p>

      {!query ? (
        <div className="text-center py-24 bg-surface-container-lowest border border-slate-100/50 rounded-2xl">
          <span className="material-symbols-outlined text-border text-6xl mb-4">
            search
          </span>
          <p className="text-on-surface-variant">
            Enter a search term in the navbar to find cars and parts.
          </p>
        </div>
      ) : cars.length === 0 && parts.length === 0 ? (
        <div className="text-center py-24 bg-surface-container-lowest border border-slate-100/50 rounded-2xl">
          <span className="material-symbols-outlined text-border text-6xl mb-4">
            search_off
          </span>
          <p className="text-on-surface-variant">
            No results found for &quot;{query}&quot;. Try adjusting your search term.
          </p>
        </div>
      ) : (
        <div className="space-y-16">
          {/* Cars Results */}
          {cars.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold headline mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">directions_car</span>
                Cars
                <span className="bg-surface-container text-xs px-2 py-0.5 rounded-full ml-2">
                  {cars.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {cars.map((car: any) => (
                  <Link
                    key={car.id}
                    href={`/cars/${car.id}`}
                    className="group bg-surface-container-lowest border border-slate-100/50 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 block"
                  >
                    <div className="relative h-48 w-full bg-surface-container">
                      {car.primary_image ? (
                        <Image
                          src={getMediaUrl(car.primary_image.image || car.primary_image)}
                          alt={`${car.brand_name || "Car"} ${car.model_name || ""}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl text-outline">
                            directions_car
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                            {car.year} • {car.brand_name || "Unknown"}
                          </p>
                          <h3 className="font-bold headline text-lg leading-tight group-hover:text-primary transition-colors">
                            {car.model_name || "Unknown"}
                          </h3>
                        </div>
                      </div>
                      <p className="text-xl font-black headline text-green-600 mt-4">
                        ₹{Number(car.price).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Parts Results */}
          {parts.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold headline mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">build</span>
                Parts & Accessories
                <span className="bg-surface-container text-xs px-2 py-0.5 rounded-full ml-2">
                  {parts.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {parts.map((part: any) => (
                  <Link
                    key={part.id}
                    href={`/parts/${part.id}`}
                    className="group flex flex-col bg-surface-container-lowest border border-slate-100/50 rounded-xl overflow-hidden hover:border-primary/30 transition-colors"
                  >
                    <div className="relative h-40 w-full bg-surface-container flex items-center justify-center">
                      {part.primary_image ? (
                        <Image
                          src={getMediaUrl(part.primary_image)}
                          alt={part.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-outline">
                          category
                        </span>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                        {part.category_name || "Unknown"}
                      </p>
                      <h3 className="font-bold headline group-hover:text-primary transition-colors line-clamp-2 mb-2">
                        {part.name}
                      </h3>
                      <div className="mt-auto pt-4 flex items-center justify-between">
                        <span className="font-black headline text-green-600">
                          ₹{Number(part.price).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
