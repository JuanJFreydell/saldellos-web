
//---- GET MESSAGES ----

// gets conversationIDs by user
// gets messages by conversation ID
// Returns a JSON object of conversations{messages{}}

//---- POST MESSAGES ----

// takes in a user and a listing.id as parameters.
// checks if the listing is active
// gets the user_id in the owner field of the listing
// checks if there are conversations between the user sending the message and the person listing
// the product that includes that lisitng_id,
// if so then it posts the message using that conversation_id,
// else creates a new conversation_id, and posts the message using that new conversation_id