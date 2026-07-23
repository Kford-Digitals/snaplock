// js/feed.js
window.onload = async function() {
    await fetchFeed();
};

async function fetchFeed() {
    const feed = document.getElementById('feedContainer');
    try {
        const { data: posts, error } = await supabaseClient
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        feed.innerHTML = posts.length ? '' : '<div class="text-center text-xs text-slate-500 py-6">No snaps found.</div>';
        
        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = "bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-xl space-y-2";
            card.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-slate-300">@Anonymous</span>
                    <span class="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">#${post.category || 'General'}</span>
                </div>
                <img src="${post.image_url}" class="w-full rounded-xl max-h-80 object-cover bg-slate-900">
                <p class="text-xs text-slate-300">${post.caption || ''}</p>
            `;
            feed.appendChild(card);
        });
    } catch(e) {
        console.error("Feed Error:", e.message);
        feed.innerHTML = '<div class="text-center text-xs text-red-400 py-6">Failed to load feed.</div>';
    }
}

async function uploadPost() {
    const fileInput = document.getElementById('imageInput');
    const category = document.getElementById('categoryInput').value;
    const caption = document.getElementById('captionInput').value;
    const btn = document.getElementById('uploadBtn');

    if (fileInput.files.length === 0) return alert("Select media first!");
    btn.innerText = "Uploading...";
    btn.disabled = true;

    try {
        const file = fileInput.files[0];
        const fileName = `snap_${Date.now()}.${file.name.split('.').pop()}`;

        await supabaseClient.storage.from('campus-images').upload(fileName, file);
        const { data: urlData } = supabaseClient.storage.from('campus-images').getPublicUrl(fileName);

        await supabaseClient.from('posts').insert([{ caption, image_url: urlData.publicUrl, category, views: 0 }]);
        alert("Snap Uploaded!");
        fileInput.value = "";
        await fetchFeed();
    } catch(e) {
        alert("Upload failed: " + e.message);
    } finally {
        btn.innerText = "Upload";
        btn.disabled = false;
    }
}
