// js/market.js
let activeMarketCategory = "All";

window.onload = async function() {
    await fetchMarketListings();
};

function toggleItemModal(show) {
    const modal = document.getElementById('postItemModal');
    if (show) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
}

async function fetchMarketListings() {
    const grid = document.getElementById('marketGrid');
    grid.innerHTML = `<div class="text-center text-xs text-slate-500 py-10 col-span-full">Filtering items...</div>`;

    try {
        let query = supabaseClient.from('listings').select('*');
        if (activeMarketCategory !== 'All') {
            query = query.eq('category', activeMarketCategory);
        }

        const { data: items, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        grid.innerHTML = "";
        if (!items || items.length === 0) {
            grid.innerHTML = `<div class="text-center text-xs text-slate-500 py-10 col-span-full">No items listed in this category yet!</div>`;
            return;
        }

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = "bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden flex flex-col justify-between p-3 shadow-lg";

            card.innerHTML = `
                <div class="relative mb-2">
                    <img src="${item.image_url || 'https://via.placeholder.com/300'}" alt="Item" class="w-full h-28 object-cover rounded-xl bg-slate-900">
                    <span class="absolute top-2 left-2 bg-emerald-600/90 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                        GHS ${parseFloat(item.price).toFixed(2)}
                    </span>
                </div>
                <div class="flex flex-col gap-1">
                    <h3 class="text-xs font-bold text-white line-clamp-1">${item.title}</h3>
                    <span class="text-[9px] text-blue-400 font-semibold">#${item.category}</span>
                    <button onclick="buyMarketItem('${item.id}', '${item.title.replace(/'/g, "\\'")}', ${item.price})" 
                            class="mt-2 w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[11px] font-extrabold py-2 rounded-xl transition cursor-pointer shadow-md">
                        💳 Pay In-App
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

    } catch (err) {
        console.error("Error loading market:", err.message);
        grid.innerHTML = `<div class="text-center text-xs text-red-400 py-10 col-span-full">Error loading market items.</div>`;
    }
}

async function filterMarket(category) {
    activeMarketCategory = category;
    const tabs = document.querySelectorAll('.mfilter-tab');
    tabs.forEach(tab => {
        if (tab.id === `mfilter-${category}`) {
            tab.className = "mfilter-tab bg-blue-600 text-white px-3 py-1.5 rounded-full font-bold whitespace-nowrap cursor-pointer";
        } else {
            tab.className = "mfilter-tab bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer";
        }
    });
    await fetchMarketListings();
}

async function uploadMarketItem() {
    const title = document.getElementById('itemTitleInput').value.trim();
    const price = document.getElementById('itemPriceInput').value;
    const category = document.getElementById('itemCategoryInput').value;
    const phone = document.getElementById('sellerPhoneInput').value.trim();
    const fileInput = document.getElementById('itemImageInput');
    const btn = document.getElementById('postItemBtn');

    if (!title || !price || !phone || fileInput.files.length === 0) {
        alert("Please complete all fields and attach an item image!");
        return;
    }

    btn.innerText = "Uploading Media...";
    btn.disabled = true;

    try {
        const file = fileInput.files[0];
        const fileName = `item_${Date.now()}.${file.name.split('.').pop()}`;

        const { error: uploadErr } = await supabaseClient.storage
            .from('campus-images')
            .upload(fileName, file);

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabaseClient.storage
            .from('campus-images')
            .getPublicUrl(fileName);

        const { error: dbErr } = await supabaseClient
            .from('listings')
            .insert([{
                title: title,
                price: parseFloat(price),
                category: category,
                seller_phone: phone,
                image_url: urlData.publicUrl
            }]);

        if (dbErr) throw dbErr;

        alert("Item listed on Campus Market!");
        toggleItemModal(false);
        await fetchMarketListings();

    } catch (err) {
        console.error("Listing Error:", err.message);
        alert("Failed to post listing: " + err.message);
    } finally {
        btn.innerText = "Publish Listing";
        btn.disabled = false;
    }
}

// --- PAYSTACK CHECKOUT ENGINE ---
function buyMarketItem(listingId, itemTitle, itemPrice) {
    const buyerPhone = prompt(`Enter your Mobile Money phone number to confirm purchase for "${itemTitle}":`);
    if (!buyerPhone) return;

    const amountInPesewas = Math.round(itemPrice * 100);

    const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: 'buyer@campus-snaplock.com',
        amount: amountInPesewas,
        currency: 'GHS',
        callback: async function(response) {
            const pickupCode = Math.floor(1000 + Math.random() * 9000).toString();

            try {
                const { error } = await supabaseClient
                    .from('orders')
                    .insert([{
                        listing_id: listingId,
                        item_title: itemTitle,
                        amount: itemPrice,
                        buyer_phone: buyerPhone,
                        paystack_ref: response.reference,
                        pickup_code: pickupCode,
                        order_status: 'PAID_IN_ESCROW'
                    }]);

                if (error) throw error;

                alert(`🎉 PAYMENT CONFIRMED!\n\nOrder Ref: ${response.reference}\nVerification Pickup Code: ${pickupCode}\n\nGive this 4-digit code to the seller when picking up your item on campus.`);

            } catch (err) {
                console.error("Order creation failed:", err.message);
                alert("Payment received, but recording failed. Ref: " + response.reference);
            }
        },
        onClose: function() {
            alert('Transaction canceled.');
        }
    });

    handler.openIframe();
}
