# beerXprt
##The guide to regular drinking

###Consists of 2 parts:

Angular client:
- Serves up a new beer each time you refresh the page

Node backend
- Grabs a random beer from local LCBO (caveat: the actual store ID is only configurable on the server side for now, but this isn't hard to fix)
- Keeps track of already selected beers such that no beer is ever chosen twice


###To run:

1. Ensure Node is installed. Get 4.2.6 LTS here: https://nodejs.org/en/download/
2. Download this project as a zip and unarchive.
3. From within the unarchived folder run:

	    npm install
	    PORT=<port> node app
