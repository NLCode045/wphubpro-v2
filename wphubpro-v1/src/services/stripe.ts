import { functions } from './appwrite';

const STRIPE_PORTAL_FUNCTION_ID = 'stripe-portal-link';

/**
 * Calls an Appwrite function to create a Stripe Billing Portal session
 * and redirects the user to the Stripe-hosted page.
 */
export const redirectToBillingPortal = async () => {
  try {
    const result = await functions.createExecution(
      STRIPE_PORTAL_FUNCTION_ID,
      JSON.stringify({ returnUrl: window.location.href }),
      false
    );
    
    // FIX: The Appwrite Execution model uses `responseStatusCode`.
    if (result.responseStatusCode >= 400) {
        // FIX: The Appwrite Execution model uses `responseBody`.
        throw new Error(JSON.parse(result.responseBody).message || 'Failed to create billing portal session.');
    }
    
    // FIX: The Appwrite Execution model uses `responseBody`.
    const { url } = JSON.parse(result.responseBody);
    if (url) {
      window.location.href = url;
    } else {
      throw new Error('Billing portal URL not returned from function.');
    }

  } catch (error) {
    console.error('Stripe Billing Portal Error:', error);
    // You could show a toast notification here
    throw error;
  }
};