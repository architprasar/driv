import Link from "next/link";
import Image from "next/image";
import HomeSelect from "./HomeSelect";
import CitySelector from "@/components/CitySelector";
import MobileMenu from "@/components/MobileMenu";
import type { CmsHome, CmsSite } from "@/lib/cms";
import { Action, Icon, Photo, SectionHeading } from "./HomePrimitives";

export function HomeHeader() {
  return (
    <header className="home-header">
      <div className="home-topbar home-container">
        <Link href="/" className="home-logo" aria-label="DrivioCars home">
          <Image
            src="/drivio-logo.png"
            alt="DrivioCars — Cars for a brighter tomorrow"
            width={1061}
            height={240}
            priority
          />
        </Link>
        <nav aria-label="Main navigation">
          {[
            ["Buy", "/cars"],
            ["Sell", "/sell"],
            ["Auctions", "/auctions"],
            ["Parts", "/parts"],
          ].map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <form action="/search" className="home-global-search">
          <Icon name="search" />
          <input
            aria-label="Search cars and parts"
            name="q"
            placeholder="Search brands, models or parts"
          />
        </form>
        <CitySelector className="home-city" />
        <div className="home-header-actions">
          {[
            ["compare_arrows", "/compare", "Compare cars"],
            ["favorite", "/saved", "Saved cars"],
            ["shopping_cart", "/cart", "Cart"],
            ["person", "/profile", "Profile"],
          ].map(([icon, href, label]) => (
            <Link key={href} href={href} aria-label={label}>
              <Icon name={icon} />
            </Link>
          ))}
        </div>
        <Link className="home-button header-sell" href="/sell">
          Sell Your Car
        </Link>
        <MobileMenu />
      </div>
      <div className="home-assurance">
        <div className="home-container">
          <span>
            <Icon name="verified_user" />
            Listing details
          </span>
          <span>
            <Icon name="lock" />
            Secure payments
          </span>
          <span>
            <Icon name="headset_mic" />
            Account support
          </span>
          <p>Cars, parts and auctions in one marketplace</p>
        </div>
      </div>
    </header>
  );
}
export function HomeHero({ cms }: { cms?: CmsHome | null }) {
  const hero = cms?.hero;
  return (
    <section className="home-hero">
      <div className="hero-art hero-scene">
        {hero?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero.image}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Image
            src="/home/hero-showroom-v2.png"
            alt="Blue Suzuki SUV in a continuous modern showroom courtyard"
            fill
            sizes="(max-width: 640px) 100vw, 64vw"
            priority
          />
        )}
      </div>
      <p className="hero-signature" aria-label="Better Cars Brighter Journeys">
        <span>Better</span>
        <span>Cars</span>
        <span>Brighter</span>
        <span>Journeys</span>
      </p>
      <p className="hero-buyer-trust">
        Cars, parts and auctions
        <br />
        in one marketplace
        <span aria-hidden="true" />
      </p>
      <div className="home-container hero-content">
        <div className="hero-copy">
          <p className="hero-eyebrow">
            {hero?.eyebrow ?? "CARS FOR A BRIGHTER TOMORROW"}
          </p>
          <h1>
            {hero ? (
              hero.title
            ) : (
              <>
                Every car journey
                <br />
                starts here.
              </>
            )}
          </h1>
          <p className="hero-description">
            {hero ? (
              hero.description
            ) : (
              <>
                Explore vehicles, ask sellers questions, follow live auctions
                <br className="desktop-break" /> and find parts for your next
                project.
              </>
            )}
          </p>
          <div className="hero-buttons">
            <Action href={hero?.primary_cta.href ?? "/cars"}>
              {hero?.primary_cta.label ?? "Explore Cars"}
            </Action>
            <Action href={hero?.secondary_cta.href ?? "/sell"} light>
              {hero?.secondary_cta.label ?? "Sell Your Car"}
            </Action>
          </div>
        </div>
        <div className="hero-badges">
          {(cms?.badges?.length
            ? cms.badges
            : [
                { icon: "forum", title: "Ask sellers", subtitle: "before buying" },
                { icon: "receipt_long", title: "Saved orders", subtitle: "track every step" },
                { icon: "gavel", title: "Vehicle auctions", subtitle: "follow your bids" },
              ]
          ).map((badge) => (
            <div key={badge.title}>
              <Icon name={badge.icon} />
              <p>
                <strong>{badge.title}</strong>
                <br />
                {badge.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
const intents = [
  [
    "directions_car",
    "Explore available cars",
    "Compare details and seller records",
    "/cars",
  ],
  [
    "sell",
    "Create your listing",
    "Set your price and manage enquiries",
    "/sell",
  ],
  [
    "gavel",
    "Bid in live auctions",
    "Quality cars at exciting prices",
    "/auctions",
  ],
  [
    "settings",
    "Find vehicle parts",
    "Check condition and compatibility",
    "/parts",
  ],
];
export function Discovery({ cms }: { cms?: CmsHome | null }) {
  const cards = cms?.intents?.length
    ? cms.intents.map((i) => [i.icon, i.title, i.subtitle, i.href])
    : intents;
  return (
    <>
      <section className="home-discovery">
        <div>
          <SectionHeading
            title="What are you looking for?"
            subtitle="Different needs. One trusted destination."
          />
          <div className="home-intents">
            {cards.map(([icon, title, text, href], index) => (
              <Link
                href={href}
                className={`intent intent-${index}`}
                key={title}
              >
                <span className="intent-icon">
                  <Icon name={icon} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
                <Icon name="arrow_forward" />
              </Link>
            ))}
          </div>
        </div>
        <div className="home-match">
          <h2>Find your match</h2>
          <p>
            Tell us what you&apos;re looking for and we&apos;ll find the right
            cars for you.
          </p>
          <form action="/cars">
            <div className="match-fields">
              <label>
                Budget
                <HomeSelect
                  aria-label="Match budget"
                  name="max_price"
                  defaultValue=""
                >
                  <option value="">Any Budget</option>
                  <option value="500000">Under ₹5 Lakh</option>
                  <option value="1000000">Under ₹10 Lakh</option>
                  <option value="2000000">Under ₹20 Lakh</option>
                </HomeSelect>
              </label>
              <label>
                Body Type
                <HomeSelect aria-label="Body type" name="body_type">
                  <option value="">Any Body Type</option>
                  <option>SUV</option>
                  <option>Sedan</option>
                  <option>Hatchback</option>
                </HomeSelect>
              </label>
              <label>
                Fuel Type
                <HomeSelect aria-label="Fuel type" name="fuel_type">
                  <option value="">Any Fuel Type</option>
                  <option value="petrol">Petrol</option>
                  <option value="diesel">Diesel</option>
                  <option value="electric">Electric</option>
                </HomeSelect>
              </label>
            </div>
            <button className="home-button">
              Show My Cars
              <Icon name="arrow_forward" />
            </button>
          </form>
          <Photo
            source={2}
            crop={[1330, 243, 198, 79]}
            alt="A selection of family SUVs"
          />
        </div>
      </section>
      <section className="home-lifestyle">
        <SectionHeading
          title="Built for your life"
          subtitle="Cars for every journey, every dream."
          href="/cars"
          link="View All Body Types"
        />
        <div className="lifestyle-grid">
          {[
            ["City Commutter", "Easy, efficient, reliable", "Hatchback"],
            ["Family SUV", "Space for what matters", "SUV"],
            ["Premium Sedan", "Luxury meets performance", "Sedan"],
            ["Weekend Adventure", "Built for the wild", "SUV"],
            ["Electric", "A cleaner tomorrow", "electric"],
            ["First Car", "Great starts, greater stories", "Hatchback"],
          ].map(([title, sub, filter], index) => (
            <Link
              href={`/cars?${index === 4 ? "fuel_type" : "body_type"}=${filter}`}
              key={title}
            >
              <Photo
                source={2}
                crop={[59 + index * 246, 401, 236, 107]}
                alt={title}
              />
              <div>
                <h3>{title}</h3>
                <p>{sub}</p>
                <Icon name="arrow_forward" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
export function PartsAndServices() {
  return (
    <section className="home-parts-services">
      <div>
        <SectionHeading
          title="Parts for every drive"
          subtitle="Browse seller listings and check delivery at checkout."
          href="/parts"
          link="View All Parts"
        />
        <div className="home-parts">
          {[
            "Tyres",
            "Batteries",
            "Brakes",
            "Lighting",
            "Accessories",
            "Oils & Fluids",
          ].map((title, index) => (
            <Link
              key={title}
              href={`/parts/list?search=${encodeURIComponent(title)}`}
            >
              <h3>{title}</h3>
              <Photo
                source={3}
                crop={[44 + index * 138, 703, 120, 119]}
                alt={title}
              />
              <Icon name="chevron_right" />
            </Link>
          ))}
        </div>
      </div>
      <div className="home-service">
        <Photo
          source={3}
          crop={[1340, 627, 226, 243]}
          alt="DrivioCars technician working on a car"
        />
        <div className="service-content">
          <div className="service-title">
            <Icon name="engineering" />
            <div>
              <h2>Service Hub</h2>
              <p>All the services your car needs, in one place.</p>
            </div>
          </div>
          <div className="service-grid">
            {[
              ["description", "Your order history", "/profile/orders"],
              ["receipt_long", "Challan Check", "/challan"],
              ["home", "Doorstep Inspection", "/sell"],
              ["car_repair", "Roadside Assistance", "/help"],
            ].map(([icon, name, href]) => (
              <Link href={href} key={name}>
                <Icon name={icon} />
                {name}
              </Link>
            ))}
          </div>
          <Action href="/help" light>
            Explore All Services
          </Action>
        </div>
      </div>
    </section>
  );
}
export function HomeTrust() {
  return (
    <>
      <section className="home-trust">
        <div className="home-container">
          <SectionHeading
            title="Follow every step of your purchase"
            subtitle="Review the evidence, keep your order reference, and stay in touch with the seller."
          />
          <div className="home-stats">
            {[
              ["receipt_long", "Saved orders", "Payment and delivery updates"],
              ["forum", "Seller enquiries", "Ask before you buy"],
              [
                "assignment_return",
                "Return requests",
                "Track instructions and refunds",
              ],
              ["gavel", "Auction tracking", "Bids and winner checkout"],
            ].map(([icon, title, label]) => (
              <div key={title}>
                <span>
                  <Icon name={icon} />
                </span>
                <p>
                  <strong>{title}</strong>
                  <br />
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="home-container">
        <section className="home-support">
          <span>
            <Icon name="headset_mic" />
          </span>
          <div>
            <h3>Need help with a purchase?</h3>
            <p>Find answers and follow support replies in your account.</p>
          </div>
          <Action href="/help">Get help</Action>
        </section>
      </div>
    </>
  );
}
export function HomeFooter({ site }: { site?: CmsSite | null }) {
  const social = Object.entries(site?.social ?? {}).filter(([, url]) => url);
  return (
    <footer className="home-footer">
      <div className="home-container footer-grid">
        <div>
          <Link href="/" className="home-logo" aria-label="DrivioCars home">
            <Image
              src="/drivio-logo-light.png"
              alt="DrivioCars — Cars for a brighter tomorrow"
              width={1061}
              height={240}
            />
          </Link>
          <p>
            {site?.brand_tagline || (
              <>
                India&apos;s trusted partner for a better
                <br />
                driving tomorrow.
              </>
            )}
          </p>
          {site && (site.contact_email || site.contact_phone || site.address) && (
            <address className="cms-contact">
              {site.contact_email && (
                <a href={`mailto:${site.contact_email}`}>{site.contact_email}</a>
              )}
              {site.contact_phone && (
                <a href={`tel:${site.contact_phone}`}>{site.contact_phone}</a>
              )}
              {site.address && <span>{site.address}</span>}
            </address>
          )}
          {social.length > 0 && (
            <div className="cms-social">
              {social.map(([name, url]) => (
                <a key={name} href={url} target="_blank" rel="noopener noreferrer">
                  {name === "x" ? "X" : name[0].toUpperCase() + name.slice(1)}
                </a>
              ))}
            </div>
          )}
          <div className="social-label">Better cars. Brighter journeys.</div>
        </div>
        {[
          [
            "Marketplace",
            "Buy Cars",
            "/cars",
            "Sell Cars",
            "/sell",
            "Auctions",
            "/auctions",
            "Parts",
            "/parts",
          ],
          [
            "Services",
            "Order tracking",
            "/profile/orders",
            "Seller enquiries",
            "/profile/enquiries",
            "Vehicle valuation",
            "/valuation",
            "Help centre",
            "/help",
          ],
          [
            "Your account",
            "Account settings",
            "/profile/settings",
            "Saved vehicles",
            "/profile/favorites",
            "Seller workspace",
            "/dashboard",
            "Partner With Us",
            "/vendor/register",
          ],
          [
            "Support",
            "Help Center",
            "/help",
            "Contact Us",
            "/help",
            "Track Order",
            "/profile/orders",
            "Returns & Refunds",
            "/policies/returns",
          ],
        ].map(([title, ...links]) => (
          <div key={title}>
            <h4>{title}</h4>
            {links
              .filter((_, index) => index % 2 === 0)
              .map((label, index) => (
                <Link key={label} href={links[index * 2 + 1]}>
                  {label}
                </Link>
              ))}
          </div>
        ))}
        <div className="footer-assured">
          <span className="footer-language">
            India · English
            <Icon name="expand_more" />
          </span>
          <div>
            <Icon name="verified_user" />
            <strong>
              DRIVIOCARS
              <br />
              <em>ASSURED</em>
            </strong>
          </div>
          <small>Review each listing’s available records.</small>
        </div>
      </div>
      <div className="footer-bottom home-container">
        <span>
          © {new Date().getFullYear()} DRIVIOCARS. All rights reserved.
        </span>
        <Link href="/policies/terms">Terms & Conditions</Link>
        <Link href="/policies/privacy">Privacy Policy</Link>
        <Link href="/help">Report a Concern</Link>
        <span>Made for a better driving tomorrow.</span>
      </div>
    </footer>
  );
}
