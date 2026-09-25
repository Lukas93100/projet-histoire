import { Platform } from "react-native";
import Purchases, { PACKAGE_TYPE, type PurchasesPackage } from "react-native-purchases";
import type { PlanId } from "@shared/catalog";
import { syncSubscription } from "./api";

const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

let configured = false;

/** Les achats ne sont disponibles que sur iOS/Android avec une clé RevenueCat. */
export const purchasesEnabled = Boolean(apiKey);

/** Associe les achats à l'utilisateur Supabase (app_user_id = UUID Supabase). */
export async function identifyPurchaser(userId: string): Promise<void> {
  if (!apiKey) return;
  if (!configured) {
    Purchases.configure({ apiKey, appUserID: userId });
    configured = true;
  } else {
    await Purchases.logIn(userId);
  }
}

export async function resetPurchaser(): Promise<void> {
  if (configured) await Purchases.logOut().catch(() => undefined);
}

export interface PlanPackage {
  plan: Exclude<PlanId, "free">;
  period: "monthly" | "yearly";
  priceString: string;
  pricePerMonthString: string | null;
  pkg: PurchasesPackage;
}

/**
 * Charge l'offre courante RevenueCat. Convention : l'identifiant produit
 * commence par l'offre (conteur_… / famille_…), le type de package donne la période.
 */
export async function loadPackages(): Promise<PlanPackage[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  return packages.flatMap((pkg): PlanPackage[] => {
    const id = pkg.product.identifier;
    const plan = id.startsWith("famille") ? "famille" : id.startsWith("conteur") ? "conteur" : null;
    if (!plan) return [];
    const period = pkg.packageType === PACKAGE_TYPE.ANNUAL ? "yearly" : "monthly";
    return [{
      plan,
      period,
      priceString: pkg.product.priceString,
      pricePerMonthString: pkg.product.pricePerMonthString,
      pkg,
    }];
  });
}

/** Achète un abonnement. Renvoie false si l'utilisateur a annulé. */
export async function purchase(pkg: PurchasesPackage): Promise<boolean> {
  try {
    await Purchases.purchasePackage(pkg);
  } catch (err) {
    if ((err as { userCancelled?: boolean | null }).userCancelled) return false;
    throw err;
  }
  await syncSubscription();
  return true;
}

export async function restorePurchases(): Promise<void> {
  if (!configured) return;
  await Purchases.restorePurchases();
  await syncSubscription();
}

export async function manageSubscription(): Promise<void> {
  if (configured) await Purchases.showManageSubscriptions();
}
