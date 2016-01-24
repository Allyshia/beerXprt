# beerXprt

Consists of 2 parts:

Angular client:
- Serves up a new beer each time you refresh

Node backend
- Grabs a random beer from local LCBO (caveat: the actual store ID is only configurable on the server side for now, but this isn't hard to fix)
- Keeps track of already selected beers such that no beer is ever chosen twice
