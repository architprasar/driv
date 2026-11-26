import Link from "next/link";
import { notFound } from "next/navigation";
import { serverFetch } from "@/lib/api-server";
import CmsBody from "@/components/CmsBody";
import { getCmsPage } from "@/lib/cms";
const titles: Record<string, string> = {
  terms: "Marketplace terms",
  privacy: "Privacy and account data",
  shipping: "Delivery and vehicle collection",
  returns: "Returns and refunds",
};
export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // A page with this slug in the CMS overrides the built-in policy text.
  const cmsPage = await getCmsPage(slug);
  if (cmsPage)
    return (
      <article className="max-w-3xl mx-auto px-6 py-14">
        <Link href="/help" className="text-blue-700 underline">
          Help centre
        </Link>
        <h1 className="text-3xl font-bold mt-5">{cmsPage.title}</h1>
        {cmsPage.intro && (
          <p className="text-lg text-slate-600 mt-3">{cmsPage.intro}</p>
        )}
        <div className="mt-8 text-slate-600 leading-7">
          <CmsBody blocks={cmsPage.body} />
        </div>
      </article>
    );
  if (!titles[slug]) notFound();
  const response = await serverFetch("/policies/");
  if (!response.ok)
    throw new Error("Marketplace policies are temporarily unavailable.");
  const policy = await response.json();
  const content: Record<string, [string, string][]> = {
    terms: [
      [
        "Buying and listing",
        "Review the seller’s description, photos, condition and compatibility before buying. Listings and seller-supplied details do not constitute an independent inspection or authenticity guarantee.",
      ],
      [
        "Price and checkout",
        "The checkout page shows the current item prices, delivery charges and tax calculation before you reserve. Payment is completed separately for the saved order. Keep your order reference and use the same saved order to retry payment.",
      ],
      [
        "Auction commitments",
        `Bid only if you intend to purchase. A winning bid that meets reserve creates a payable order. The winner’s payment window is ${policy.auction_payment_hours} hours. Private maximum bids remain hidden from other bidders.`,
      ],
      [
        "Vehicle handover",
        "Arrange collection with the seller. Check the vehicle, its keys and registration/transfer documents before confirming receipt. Confirmation in the app records handover; it does not itself transfer legal vehicle ownership.",
      ],
      [
        "Help and disputes",
        "Keep communications and order references in your account. Open a support request if a listing, payment, delivery or return needs investigation. Do not pay off-platform in response to an unsolicited message.",
      ],
    ],
    shipping: [
      [
        "Parts delivery",
        "Choose an available delivery or collection method at checkout. The seller prepares paid items and enters courier/tracking details. Delivery timing and carrier updates are provided by the seller; the app does not promise a carrier delivery date.",
      ],
      [
        "Delivery charges",
        `Review the final quote before reserving. The configured express delivery charge is ${policy.express_fee} ${policy.currency}; applicable delivery options and charges appear in checkout.`,
      ],
      [
        "Vehicle collection",
        "Vehicle purchases use pickup and handover. Ask the seller for the collection location, appointment and required documents. Confirm handover only after receiving and checking the vehicle, keys and documents.",
      ],
      [
        "Track your order",
        "Your account shows each item’s fulfilment status, seller note and available tracking reference. Confirm receipt yourself after delivery. Contact support for an item that has not arrived.",
      ],
    ],
    returns: [
      [
        "Request window",
        `You may request a return through the order item within ${policy.return_window_days} days after you confirm receipt. Describe the problem and keep the item and packaging available for inspection.`,
      ],
      [
        "Return instructions",
        "The seller reviews the request and provides return or collection instructions. Do not send an item to an unconfirmed address. If a request is rejected or disputed, contact support with the order number.",
      ],
      [
        "Refund initiation",
        "Once the seller physically receives and accepts the return, the app initiates a refund to the original payment method and records its status. A pending refund is not a completed refund. Provider processing times can vary; no bank credit time is guaranteed.",
      ],
      [
        "Cancellation",
        "You can cancel eligible unfulfilled orders from your account. Dispatched or received items use the return process. A seller who cannot supply a paid item cancels that item and initiates the applicable refund.",
      ],
      [
        "Charges and records",
        "The refund record shows the actual amount and status. Delivery charges may be excluded from a returned-item refund. Review the order and contact support if the amount needs investigation.",
      ],
    ],
    privacy: [
      [
        "Information used by the marketplace",
        "Account contact details, addresses, listings, enquiries, bids, orders, messages and uploaded files support marketplace operation and customer support. Sellers receive the customer information needed to answer enquiries and fulfil their own sales.",
      ],
      [
        "Payment information",
        "Live payments are handled on the payment provider’s hosted checkout. The marketplace stores order and provider references and payment/refund status; it does not collect card numbers in its own forms.",
      ],
      [
        "Account and service storage",
        "The website uses session cookies and browser storage for sign-in, checkout recovery and saved comparison choices. Keep shared devices secure and sign out when finished.",
      ],
      [
        "Account requests",
        "Use account settings to update your profile and password. Submit a support request for access, correction, deletion or other privacy questions. Order and financial records may need review before a request can be completed.",
      ],
      [
        "Safe communication",
        "Do not put card numbers, passwords or verification codes in enquiries or support messages. Email delivery and payment services process information necessary to provide their functions.",
      ],
    ],
  };
  return (
    <article className="max-w-3xl mx-auto px-6 py-14">
      <Link href="/help" className="text-blue-700 underline">
        Help centre
      </Link>
      <h1 className="text-3xl font-bold mt-5 mb-8">{titles[slug]}</h1>
      {content[slug].map(([title, body]) => (
        <section className="my-7" key={title}>
          <h2 className="text-xl font-semibold mb-3">{title}</h2>
          <p className="text-slate-600 leading-7">{body}</p>
        </section>
      ))}
      {policy.operator_name && (
        <section className="my-8 border-t pt-6">
          <h2 className="font-semibold">Marketplace operator</h2>
          <p className="mt-2">{policy.operator_name}</p>
          <p className="whitespace-pre-wrap mt-2">{policy.operator_address}</p>
        </section>
      )}
      <Link
        className="inline-block rounded-lg bg-blue-600 text-white px-5 py-3 mt-6"
        href="/profile/support"
      >
        Contact support
      </Link>
    </article>
  );
}
