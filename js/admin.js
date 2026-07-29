// Master Admin PIN Code
const ADMIN_PIN = "0201521497534187815"; 

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();
});

function checkAdminAccess() {
    const userPin = prompt("🔒 Restricted Access: Enter Admin PIN");

    if (userPin === ADMIN_PIN) {
        document.getElementById('adminContent').classList.remove('hidden');
        fetchAdminStats();
        loadOrders();
        loadListings();
    } else {
        alert("❌ Incorrect PIN. Access Denied.");
        document.body.innerHTML = `
            <div class="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-4 text-center">
                <h1 class="text-3xl font-black text-red-500 mb-2">403 Unauthorized</h1>
                <p class="text-xs mb-4">You do not have permission to view the Campus SnapLock Admin Panel.</p>
                <a href="index.html" class="bg-blue-600 text-white text-xs px-4 py-2 rounded-xl font-bold">Return to Digital Store</a>
            </div>
        `;
    }
}

// 1. Fetch Digital Sales Metrics
async function fetchAdminStats() {
    try {
        // Fetch Active E-Book Listings Count
        const { count: listingsCount, error: lError } = await supabaseClient
            .from('listings')
            .select('*', { count: 'exact', head: true });

        if (!lError && document.getElementById('statListings')) {
            document.getElementById('statListings').innerText = listingsCount || 0;
        }

        // Fetch Total Sales
        const { data: orders, error: oError } = await supabaseClient
            .from('orders')
            .select('amount, order_status');

        if (!oError && orders) {
            const totalSalesCount = orders.length;
            const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.amount) || 0), 0);

            if (document.getElementById('statTotalSales')) {
                document.getElementById('statTotalSales').innerText = totalSalesCount;
            }
            if (document.getElementById('statCompleted')) {
                document.getElementById('statCompleted').innerText = totalRevenue.toFixed(2);
            }
        }

    } catch (err) {
        console.error("Error fetching stats:", err.message);
    }
}

// 2. Load Completed PDF Purchases
async function loadOrders() {
    const tableBody = document.getElementById('adminOrdersTable');
    if (!tableBody) return;

    try {
        const { data: orders, error } = await supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!orders || orders.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">No purchases recorded yet.</td></tr>`;
            return;
        }

        tableBody.innerHTML = orders.map(order => `
            <tr class="hover:bg-slate-700/50 transition">
                <td class="p-2 font-semibold text-white">${order.item_title || 'Digital Content'}</td>
                <td class="p-2 text-emerald-400 font-bold">GHS ${parseFloat(order.amount || 0).toFixed(2)}</td>
                <td class="p-2 text-slate-300">${order.buyer_phone || 'Instant Delivery'}</td>
                <td class="p-2">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900/50 text-emerald-400 border border-emerald-700">
                        INSTANT DOWNLOAD UNLOCKED
                    </span>
                </td>
                <td class="p-2 text-slate-400 text-[10px]">
                    ${new Date(order.created_at).toLocaleDateString()}
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error("Error loading orders:", err.message);
        tableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-400">Failed to load order history.</td></tr>`;
    }
}

// 3. Publish E-Book / PDF Resource
async function handleAdminUpload(event) {
    event.preventDefault();

    const title = document.getElementById('adminTitle').value.trim();
    const price = document.getElementById('adminPrice').value.trim();
    const category = document.getElementById('adminCategory').value;
    const phone = document.getElementById('adminPhone').value.trim();
    const downloadUrl = document.getElementById('adminFileUrl').value.trim();
    const imageFile = document.getElementById('adminImage').files[0];
    const submitBtn = document.getElementById('adminSubmitBtn');

    if (!title || !price || !phone || !downloadUrl) {
        alert("Please fill in title, price, contact phone, and PDF download link.");
        return;
    }

    submitBtn.innerText = "Publishing E-Book...";
    submitBtn.disabled = true;

    try {
        let imageUrl = '';

        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `cover_${Math.random()}_${Date.now()}.${fileExt}`;
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

        const { error: dbError } = await supabaseClient
            .from('listings')
            .insert([{
                title: title,
                price: parseFloat(price),
                category: category,
                seller_phone: phone,
                image_url: imageUrl,
                file_url: downloadUrl
            }]);

        if (dbError) throw dbError;

        alert("🎉 E-book / PDF published to store catalog!");
        document.getElementById('adminUploadForm').reset();
        loadListings();
        fetchAdminStats();

    } catch (err) {
        console.error("Upload error:", err.message);
        alert("Failed to publish resource: " + err.message);
    } finally {
        submitBtn.innerText = "🚀 Publish E-Book to Digital Store";
        submitBtn.disabled = false;
    }
}

// 4. Catalog Moderation
async function loadListings() {
    const grid = document.getElementById('adminListingsGrid');
    if (!grid) return;

    try {
        const { data: listings, error } = await supabaseClient
            .from('listings')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!listings || listings.length === 0) {
            grid.innerHTML = `<p class="text-xs text-slate-500 col-span-full">No active products in catalog.</p>`;
            return;
        }

        grid.innerHTML = listings.map(item => `
            <div class="bg-slate-900 border border-slate-700 p-3 rounded-xl flex items-center justify-between">
                <div class="flex items-center space-x-3 overflow-hidden">
                    <img src="${item.image_url || 'https://via.placeholder.com/80?text=PDF'}" alt="${item.title}" class="w-12 h-12 object-cover rounded-lg bg-slate-800">
                    <div class="truncate">
                        <p class="text-xs font-bold text-white truncate">${item.title}</p>
                        <p class="text-[10px] text-emerald-400 font-bold">GHS ${parseFloat(item.price).toFixed(2)}</p>
                        <span class="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">${item.category || 'PDF'}</span>
                    </div>
                </div>
                <button onclick="deleteListing('${item.id}')" 
                        class="bg-red-900/50 hover:bg-red-800 text-red-300 border border-red-700 text-xs font-bold px-2.5 py-1 rounded-lg transition">
                    🗑️ Delete
                </button>
            </div>
        `).join('');

    } catch (err) {
        console.error("Error loading listings:", err.message);
        grid.innerHTML = `<p class="text-xs text-red-400 col-span-full">Failed to load catalog.</p>`;
    }
}

// 5. Delete Item from Store
async function deleteListing(listingId) {
    if (!confirm("Are you sure you want to remove this PDF/E-book from the catalog?")) return;

    try {
        const { error } = await supabaseClient
            .from('listings')
            .delete()
            .eq('id', listingId);

        if (error) throw error;

        alert("Digital product removed.");
        loadListings();
        fetchAdminStats();

    } catch (err) {
        alert("Failed to delete product: " + err.message);
    }
}
