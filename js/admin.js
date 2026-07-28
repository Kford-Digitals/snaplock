document.addEventListener('DOMContentLoaded', () => {
    fetchAdminStats();
});

// Fetch metrics, orders, and listings
async function fetchAdminStats() {
    loadOrders();
    loadListings();
}

// Load Escrow Orders
async function loadOrders() {
    const tableBody = document.getElementById('adminOrdersTable');
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        let escrowCount = 0;
        let completedCount = 0;

        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-500">No orders found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(order => {
            if (order.order_status === 'PAID_IN_ESCROW') escrowCount++;
            if (order.order_status === 'COMPLETED') completedCount++;

            return `
                <tr class="hover:bg-slate-700/50">
                    <td class="p-2 font-medium">${order.item_title || 'N/A'}</td>
                    <td class="p-2 text-emerald-400 font-bold">GHS ${order.amount}</td>
                    <td class="p-2">${order.buyer_phone}</td>
                    <td class="p-2 font-mono font-bold text-amber-400">${order.pickup_code || '---'}</td>
                    <td class="p-2">
                        <span class="text-[10px] px-2 py-0.5 rounded-full ${order.order_status === 'COMPLETED' ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-900 text-amber-300'}">
                            ${order.order_status}
                        </span>
                    </td>
                    <td class="p-2">
                        ${order.order_status === 'PAID_IN_ESCROW' ? 
                            `<button onclick="releaseEscrowFunds('${order.id}')" class="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-2 py-1 rounded">Release Payout</button>` : 
                            `<span class="text-[10px] text-slate-500">Done</span>`}
                    </td>
                </tr>
            `;
        }).join('');

        document.getElementById('statEscrow').innerText = escrowCount;
        document.getElementById('statCompleted').innerText = completedCount;

    } catch (err) {
        console.error("Failed to load orders:", err.message);
    }
}

// Manually Release Escrow Funds
async function releaseEscrowFunds(orderId) {
    if (!confirm("Confirm that the buyer has received the item/file and release payment to the seller?")) return;

    try {
        const { error } = await supabaseClient
            .from('orders')
            .update({ order_status: 'COMPLETED' })
            .eq('id', orderId);

        if (error) throw error;

        alert("✅ Order marked as COMPLETED!");
        loadOrders();
    } catch (err) {
        alert("Error updating order: " + err.message);
    }
}

// Load Active Listings for Moderation
async function loadListings() {
    const grid = document.getElementById('adminListingsGrid');
    try {
        const { data, error } = await supabaseClient
            .from('listings')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        document.getElementById('statListings').innerText = data ? data.length : 0;

        if (!data || data.length === 0) {
            grid.innerHTML = `<p class="text-xs text-slate-500 col-span-full">No active listings.</p>`;
            return;
        }

        grid.innerHTML = data.map(item => `
            <div class="bg-slate-900 p-3 rounded-xl border border-slate-700 flex justify-between items-center">
                <div>
                    <h4 class="text-xs font-bold text-white">${item.title}</h4>
                    <p class="text-[10px] text-slate-400">GHS ${item.price} • Seller: ${item.seller_phone}</p>
                </div>
                <button onclick="deleteListing('${item.id}')" class="bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white text-[10px] px-2.5 py-1 rounded border border-red-500/30 transition">
                    Delete
                </button>
            </div>
        `).join('');

    } catch (err) {
        console.error("Failed to load listings:", err.message);
    }
}

// Delete Listing
async function deleteListing(itemId) {
    if (!confirm("Are you sure you want to remove this item from the market?")) return;

    try {
        const { error } = await supabaseClient
            .from('listings')
            .delete()
            .eq('id', itemId);

        if (error) throw error;

        alert("Item deleted.");
        loadListings();
    } catch (err) {
        alert("Failed to delete item: " + err.message);
    }
}
