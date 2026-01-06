import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedUser, getUserProfile } from "@/lib/auth-server";

//---- GET CONVERSATIONS ----
// takes userID (from session) and listingID (from query params)
// validates that the user is authorized
// checks if conversation exists between user and listing owner
// if exists, returns conversation_id
// if not, creates new conversation and returns conversation_id

export async function GET(request: Request) {
  try {
    // 1. Authenticate user
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // 2. Get user profile
    const userProfile = await getUserProfile(authUser.id);

    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found or inactive" }, { status: 404 });
    }

    // 3. Get listing_id from query parameters
    const { searchParams } = new URL(request.url);
    const listing_id = searchParams.get("listing_id");

    if (!listing_id || listing_id.trim() === "") {
      return NextResponse.json(
        { error: "listing_id is required" },
        { status: 400 }
      );
    }

    const userId = authUser.id;
    const normalizedListingId = listing_id.trim();

    // 4. Get listing to find the owner
    const { data: listing, error: listingError } = await supabaseAdmin
      .from("listings")
      .select("owner_id, status")
      .eq("listing_id", normalizedListingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    // Check if listing is active
    if (listing.status !== "active") {
      return NextResponse.json(
        { error: "Listing is not active" },
        { status: 400 }
      );
    }

    const ownerId = listing.owner_id;

    // Prevent users from messaging themselves
    if (userId === ownerId) {
      return NextResponse.json(
        { error: "You cannot message yourself" },
        { status: 400 }
      );
    }

    // 5. Check if conversation exists between current user and listing owner for this listing
    const { data: existingConversations, error: conversationSearchError } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("listing_id", normalizedListingId);

    if (conversationSearchError) {
      console.error("Error searching for conversation:", conversationSearchError);
      return NextResponse.json(
        { error: "Failed to search for conversation" },
        { status: 500 }
      );
    }

    // Find conversation where both participants match (current user and listing owner)
    let conversation = existingConversations?.find((conv) => {
      // Check if both participants match (order doesn't matter)
      return (
        (conv.participant_1 === userId && conv.participant_2 === ownerId) ||
        (conv.participant_1 === ownerId && conv.participant_2 === userId)
      );
    });

    let conversationId: string;

    // 6. Create conversation if it doesn't exist
    if (!conversation) {
      const { data: newConversation, error: createConversationError } = await supabaseAdmin
        .from("conversations")
        .insert({
          participant_1: userId,
          participant_2: ownerId,
          listing_id: normalizedListingId,
        })
        .select()
        .single();

      if (createConversationError || !newConversation) {
        console.error("Error creating conversation:", createConversationError);
        return NextResponse.json(
          { error: "Failed to create conversation" },
          { status: 500 }
        );
      }

      conversationId = newConversation.conversation_id.toString();
    } else {
      conversationId = conversation.conversation_id.toString();
    }

    return NextResponse.json(
      {
        success: true,
        conversation_id: conversationId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in getConversations endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

