# Methodology

## Platform Identification:

The process of platform discovery and identification started by intercepting network traffic on the Rouses Markets storefront, which revealed a centralized API cluster hosted at `production-us-1.noq-servers.net`. Then for identifying the main ecommerce platform provider, I looked at the footers which said "Powered by eGrowcery" and the endpoints I found using DNSDumpster also mentioned eGrowcery confirming the eCommerce provider.

## Signals for Enumeration of stores:

To find other retailers using eCommerce, I used DNSDumpster and searched for noq-servers.net which revealed retailers like BrookshireBrothers, Fresh Food Marketplace, and Shop Sands but Shop Sands' website was offline which caused me to not add it in the `findings.json` for integrity.

I found more sources by using Google Search as a tool and searched for retailers using eGrowcery and found Piggly Wiggly (Russell) and Riesbeck's Food Markets using eGrowcery.

I verified all of them by going to each of the websites and looking at the footer for eGrowcery mention which they had as well as using devtools to look for api endpoint they were hitting which was noq-servers.net conforming their use of eGrowcery.

## Gaps, Limitations, and Future Scaling

The current list focuses on only verified links as there might be many headless API endpoints, as several links like Shop Sands only work by clicking certain links within their website or custom retailer domains.

To capture every store, I would use tools like PublicWWW to look for eGrowcery API endpoint signatures. I would also write a script to iterate through the numeric store ID range on the production-us-1 cluster to identify every active branch and its corresponding retailer name.