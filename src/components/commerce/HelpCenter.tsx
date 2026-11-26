"use client";
import { useState } from "react";
import Link from "next/link";
const answers = [
  [
    "How do I buy a car?",
    "Open an available vehicle, review its details and request a test drive or ask the seller a question. Buy from the vehicle page, review the quote and complete payment for your saved order. Arrange pickup with the seller and confirm the keys and documents at handover.",
  ],
  [
    "How do I check whether a part fits?",
    "Use the seller-listed make/model compatibility and confirm the OEM part number, model year and installation requirements with the seller. Compatibility information is not an independent fitment guarantee.",
  ],
  [
    "My checkout failed or the page closed. What should I do?",
    "Check My orders before starting another purchase. The app saves the order before payment and lets you retry from the same order. Returning to checkout can recover an interrupted reservation.",
  ],
  [
    "My payment was declined. Can I retry?",
    "Open the saved order and continue payment again. If a provider payment is still processing, verify it from that order rather than creating another order. Unpaid reservations have an expiry time shown on the order.",
  ],
  [
    "I paid, but my order has not updated.",
    "Open the saved order and use payment verification if available. Provider notifications may arrive after you return from checkout. Contact support with the order reference if it still needs investigation; do not repeat a payment from a new order.",
  ],
  [
    "How do I track delivery?",
    "My orders shows the status of each item and the seller’s tracking reference, carrier and updates. Confirm receipt only after checking the delivered item. Vehicle orders use pickup and handover.",
  ],
  [
    "How do I return an item?",
    "After receipt, open the order item and choose Request return within the displayed policy window. Wait for seller approval and return instructions. A refund is initiated after the returned item is received and accepted.",
  ],
  [
    "How do auction bids work?",
    "You can place a bid or register a private maximum. Other buyers cannot see your maximum. If you win and the reserve is met, a payable order appears in your account. Complete it before the winner payment window expires.",
  ],
  [
    "How do I list cars or parts?",
    "Use the seller workspace to add accurate details and upload photos. Set your real price and part stock. Create an auction only for an available vehicle you own. Paid sales appear in Sales for preparation and dispatch or pickup.",
  ],
  [
    "When can vendors request settlement?",
    "Paid sales create earnings records. Eligible earnings become available after customer receipt and the return window. A verified business connects its payment account and requests settlement from the vendor workspace. A transfer record does not itself prove a bank payout has arrived.",
  ],
  [
    "How do I reset my password or verify my email?",
    "Use Forgot password on the login page. Verification links are sent after registration and can be resent from Account settings. Check spam folders. If a link expired, request a new one.",
  ],
  [
    "How do I follow a support request?",
    "Sign in and open Help & support. Create a request with the relevant order or listing reference. View the request for support replies and send follow-up messages. Replying to a closed request reopens it.",
  ],
];
export default function HelpCenter() {
  const [query, setQuery] = useState("");
  const filtered = answers.filter((a) =>
    a.join(" ").toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <section className="max-w-4xl mx-auto px-6 py-14">
      <h1 className="text-4xl font-bold">How can we help?</h1>
      <p className="mt-4 text-slate-600">
        Guidance for buying, selling, payments, auctions and your account.
      </p>
      <label className="block mt-7 font-semibold">
        Search help
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block border rounded-xl px-4 py-3 w-full mt-2"
          placeholder="Try payment, delivery or returns"
        />
      </label>
      <div className="flex flex-wrap gap-3 my-7">
        {[
          ["My orders", "/profile/orders"],
          ["Contact support", "/profile/support"],
          ["Return policy", "/policies/returns"],
        ].map(([label, href]) => (
          <Link
            className="rounded-lg border px-4 py-3 text-blue-700"
            href={href}
            key={href}
          >
            {label}
          </Link>
        ))}
      </div>
      {!filtered.length && (
        <p role="status">
          No help topics match that search. Try a different word or contact
          support.
        </p>
      )}
      <div className="space-y-3">
        {filtered.map(([question, answer]) => (
          <details key={question} className="rounded-xl border p-5">
            <summary className="font-semibold cursor-pointer">
              {question}
            </summary>
            <p className="mt-4 text-slate-600 leading-7">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
