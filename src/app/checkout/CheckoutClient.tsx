"use client";
import {Suspense} from "react";
import Checkout from "@/components/commerce/Checkout";
export default function CheckoutClient(props:{cart:unknown;addresses:unknown[]}){void props;return <Suspense fallback={<p>Loading checkout…</p>}><Checkout/></Suspense>;}
