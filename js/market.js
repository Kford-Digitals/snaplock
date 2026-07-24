// Global State for Listings
let allListings = [];

// Load listings when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    fetchMarketListings();
});

// Toggle Item Posting Modal
function toggleItemModal(show) {
    const modal = document.getElementById('postItemModal');
    if (!modal) return;
    
    if (show) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
        resetModalInputs();
    }
}

// Reset Form Inputs
function resetModalInputs() {
    document.getElementById('itemTitleInput').value = '';
    document.getElementById('itemPriceInput').value = '';
    document.getElementById('sellerPhoneInput').value = '';
    document.getElementById('itemImageInput').value = '';
}

// Fetch Listings from Supabase
async function fetchMarketListings() {
    const grid = document.getElementById('marketGrid');
    if (!grid) return;

    try {
        const { data, error } = await supabaseClient
            .from('listings')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allListings = data || [];
        renderListings(allListings);

    } catch (err) {
        console.error("Error fetching listings:", err.message);
        grid.innerHTML = `<div class="text-center text-xs text-red-400 py-10 col-span-full">Failed to load items. Check console.</div>`;
    }
}

// Filter Listings by Category
function filterMarket(category) {
    // Update tab styling
    document.querySelectorAll('.mfilter-tab').forEach(tab => {
        tab.classList.remove('bg-blue-600', 'text-white');
        tab.classList.add('bg-slate-800', 'text-slate-300');
    });

    const selectedTab = document.getElementById(`mfilter-${category}`);
    if (selectedTab) {
        selectedTab.classList.remove('bg-slate-800', 'text-slate-300');
        selectedTab.classList.add('bg-blue-600', 'text-white');
    }

    if (category === 'All') {
        renderListings(allListings);
    } else {
        const filtered = allListings.filter(item => item.category === category);
        renderListings(filtered);
    }
}

// Render Listings Grid
function renderListings(items) {
    const grid = document.getElementById('marketGrid');
    if (!grid) return;

    if (!items || items.length === 0) {
        grid.innerHTML = `<div class="text-center text-xs text-slate-500 py-10 col-span-full">No listings found in this category.</div>`;
        return;
    }

    grid.innerHTML = items.map(item => `
        <div class="bg-slate-800 border border-slate-700 rounded-2xl p-3 flex flex-col justify-between shadow-lg">
            <div>
                <img src="${item.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}" 
                     alt="${item.title}" 
                     class="w-full h-32 object-cover rounded-xl mb-2 bg-slate-900">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-blue-400 inline-block mb-1">
                    ${item.category || 'General'}
                </span>
                <h3 class="text-xs font-bold text-white line-clamp-1">${item.title}</h3>
                <p class="text-sm font-black text-emerald-400 mt-1">GHS ${parseFloat(item.price).toFixed(2)}</p>
            </div>
            
            <button onclick="buyMarketItem('${item.id}', '${item.title.replace(/'/g, "\\'")}', '${item.price}')" 
                    class="w-full mt-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer">
                💳 Pay In-App
            </button>
        </div>
    `).join('');
}

// Upload New Item to Supabase
async function uploadMarketItem() {
    const title = document.getElementById('itemTitleInput').value.trim();
    const price = document.getElementById('itemPriceInput').value.trim();
    const category = document.getElementById('itemCategoryInput').value;
    const phone = document.getElementById('sellerPhoneInput').value.trim();
    const imageFile = document.getElementById('itemImageInput').files[0];
    const postBtn = document.getElementById('postItemBtn');

    if (!title || !price || !phone) {
        alert("Please fill in item name, price, and your phone number.");
        return;
    }

    postBtn.innerText = "Publishing...";
    postBtn.disabled = true;

    try {
        let imageUrl = '';

        // Handle Image Upload if selected
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Math.random()}_${Date.now()}.${fileExt}`;
            const filePath = `market/${fileName}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('snapshots')
                .upload(filePath, imageFile);

            if (uploadError) throw uploadError;

            const { data } = supabaseClient.storage
                .from('snapshots')
                .getPublicUrl(filePath);

            imageUrl = data.publicUrl;
        }

        // Insert into Database
        const { error: dbError } = await supabaseClient
            .from('listings')
            .insert([{
                title: title,
                price: parseFloat(price),
                category: category,
                seller_phone: phone,
                image_url: imageUrl
            }]);

        if (dbError) throw dbError;

        alert("🎉 Item published successfully!");
        toggleItemModal(false);
        fetchMarketListings();

    } catch (err) {
        console.error("Error publishing listing:", err.message);
        alert("Failed to publish listing: " + err.message);
    } finally {
        postBtn.innerText = "Publish Listing";
        postBtn.disabled = false;
    }
}

// Paystack In-App Payment Trigger
function buyMarketItem(listingId, itemTitle, itemPrice) {
    const buyerPhone = prompt(`Enter your Mobile Money phone number to confirm purchase for "${itemTitle}":`);
    if (!buyerPhone) return;

    // Convert GHS price into pesewas
    const amountInPesewas = Math.round(parseFloat(itemPrice) * 100);

    try {
        if (typeof PaystackPop === 'undefined') {
            alert("Paystack SDK failed to load. Please check your internet connection or disable ad-blockers!");
            return;
        }

        const handler = PaystackPop.setup({
            key: PAYSTACK_PUBLIC_KEY,
            email: 'buyer@campus-snaplock.com',
            amount: amountInPesewas,
            currency: 'GHS',
            ref: 'CSL_' + Math.floor((Math.random() * 1000000000) + 1),
            callback: async function(response) {
                const pickupCode = Math.floor(1000 + Math.random() * 9000).toString();

                try {
                    const { error } = await supabaseClient
                        .from('orders')
                        .insert([{
                            listing_id: listingId,
                            item_title: itemTitle,
                            amount: parseFloat(itemPrice),
                            buyer_phone: buyerPhone,
                            paystack_ref: response.reference,
                            pickup_code: pickupCode,
                            order_status: 'PAID_IN_ESCROW'
                        }]);

                    if (error) throw error;

                    alert(`🎉 PAYMENT CONFIRMED!\n\nOrder Ref: ${response.reference}\nYour Pickup Code: ${pickupCode}\n\nShow this code to the seller upon delivery!`);

                } catch (err) {
                    console.error("Order creation failed:", err.message);
                    alert("Payment received, but database recording failed: " + err.message);
                }
            },
            onClose: function() {
                alert('Payment window closed.');
            }
        });

        handler.openIframe();

    } catch (err) {
        console.error("Paystack Error:", err);
        alert("Failed to open payment modal: " + err.message);
    }
}
