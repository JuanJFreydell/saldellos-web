// TypeScript types for the listings table
export interface Listing {
    listing_id: string,
    owner_id: string,
    title: string,
    description: string,
    address: string | null,
    neighborhood_id: string,
    listing_date: string; // ISO timestamp string
    number_of_prints: string,
    number_of_visits: string,
    status: string
  }
  
  export interface UpdateListing {
    listing_id: string,
    owner_id: string,
    title?: string | null,
    description?: string | null,
    address?: string | null,
    neighborhood_id?: string | null,
    number_of_prints?: string | null,
    number_of_visits?: string | null,
    status: string
    }
  
  