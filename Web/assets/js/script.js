/*  ====== SUPABASE INTEGRATION (ADD ON TOP) ====== */
/* 1) Include supabase-js if not using bundler.
   In your index.html (head or before script.js) add:
   <script src="https://esm.sh/@supabase/supabase-js@2"></script>
   This will expose window.supabase.
*/
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
window.sb = createClient("https://aigiahcecfgdrwygqwij.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpZ2lhaGNlY2ZnZHJ3eWdxd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MTY3OTgsImV4cCI6MjA4MDA5Mjc5OH0.ZnCQGV3iSTniq1SVWVHs8u8-J3Ai0Df46ZRKMcG1a5Q");


// --- anonymous persistent id per browser (UUID v4)
function getOrCreateUserId() {
    let uid = localStorage.getItem('guest_user_id_v1');
    if (!uid) {
        // browsers supporting crypto.randomUUID()
        if (crypto && crypto.randomUUID) uid = crypto.randomUUID();
        else uid = 'u-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem('guest_user_id_v1', uid);
    }
    return uid;
}
const GUEST_ID = getOrCreateUserId();
async function loadInitialData() {
    for (let i = 0; i < artworks.length; i++) {
        // load comments
        sessionComments[i] = await loadCommentsFromDB(i);

        // load like count
        const count = await fetchLikeCount(i);

        // check if this user liked it
        const { data } = await sb
            .from('likes')
            .select('id')
            .match({ artwork_index: i, user_id: GUEST_ID })
            .limit(1)
            .maybeSingle();

        if (data) sessionLikes.add(i);
    }
}

// --- Load comments for an artwork index from Supabase
async function loadCommentsFromDB(artworkIndex) {
    if (!sb) return [];
    const { data, error } = await sb
        .from('comments')
        .select('id, artwork_index, user_id, username, body, created_at')
        .eq('artwork_index', artworkIndex)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Failed to load comments:', error);
        return [];
    }
    // map to your existing comment shape: { text, ts, name }
    const comments = (data || []).map(c => ({
        text: c.body,
        ts: new Date(c.created_at).getTime(),
        name: c.username || 'Anonymous',
        id: c.id,
        user_id: c.user_id
    }));
    return comments;
}

// --- Post a comment to Supabase (and return inserted row)
async function postCommentToDB(artworkIndex, username, bodyText) {
    if (!sb) {
        // fallback to local-only behaviour
        return null;
    }
    const payload = {
        artwork_index: artworkIndex,
        user_id: GUEST_ID,
        username: username || null,
        body: bodyText
    };

    const { data, error } = await sb.from('comments').insert(payload).select().single();
    if (error) {
        console.error('Error inserting comment:', error);
        throw error;
    }
    return data;
}

// --- Toggle like (insert). We'll try to insert; if unique constraint prevents duplicate, ignore error.
// Optionally support "unlike" by deleting row if exists.
async function addLikeToDB(artworkIndex) {
    if (!sb) return null;

    const payload = { artwork_index: artworkIndex, user_id: GUEST_ID };
    // try insert
    const { data, error } = await sb.from('likes').insert(payload).select().single();
    if (error) {
        // if unique constraint violation (duplicate), it will error 23505; ignore for now
        if (error.details && error.details.includes('already exists')) {
            // already liked
            return null;
        } else {
            console.error('Error inserting like:', error);
            throw error;
        }
    }
    return data;
}

// --- Realtime subscriptions: listens for new comments and likes
function subscribeRealtime(onComment, onLike) {
    if (!sb) return;

    // Comments
    sb.channel('comments_channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
            try { onComment && onComment(payload.new); } catch (e) { console.error(e); }
        })
        .subscribe();

    // Likes
    sb.channel('likes_channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, payload => {
            try { onLike && onLike(payload.new); } catch (e) { console.error(e); }
        })
        .subscribe();

    // (Optionally also listen for DELETE on likes if you implement unlike)
}

/* ===========================
           Data & gallery rendering
           =========================== */
const artworks = [
    {
        title: "Mga Mukha ng Katiwalian",
        category: "Visual Arts",
        description: "Isang mahusay na pagpipinta na naglalarawan ng mga mukha ng katiwalian sa ating lipunan.",
        artist: "Maria Santos",
        medium: "Oil on Canvas",
        category: "visual",
        year: "2024",
        type: "image", // Add type field
        image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1200&q=80"
    },
    { 
       title: "Uhaw sa Hustisya", 
       category: "Visual Arts", 
       description: "The main subject of the artwork is greed and the power of money represented through a drawing of a wealthy crocodile dressed in a suit. It explores the ongoing issue of corruption in our country, exposing the rotten ways used in “silencing” the voices of the Filipino people. It was originally made as commissioned artwork in which the artist used it as an opportunity for social advocacy and to raise awareness.", 
       artist: "Inoue", 
       medium: "Digital Drawing", 
       category: "visual", 
       year: "2025",
       type: "image",
       image: "assets/visual arts/labrador.webp" 
    },
    { 
       title: "Corruption in the Philippines", 
       category: "Visual Arts", 
       description: "Corruption in the Philippines is a drawing that reflects the grim reality of justice and morality in our country. At the center of the piece is a crocodile lavishly throwing around money, with its tail creating a hole through the broken gavel it sits on. This symbolizes the consequence of corruption, breaking the very foundation and instrument of the justice system in which ordinary people rely on.", 
       artist: "Nathaniel Esplana", 
       medium: "Drawing", 
       category: "visual", 
       year: "2025",
       type: "image",
       image: "assets/visual arts/belga.webp" 
    },
    { 
       title: "Lubog sa Korupsyon", 
       category: "Visual Arts", 
       description: "Lubog sa Korupsyon shows the conflict between two groups; one on the comfort of a throne made from wealth, while the others rise up against them amidst heavy flooding. This artwork aims to depict the reality of governance in the Philippines, highlighting how corruption among politicians leads to the suffering of the Filipino people. It serves as an eye-opener for the Filipinos to be aware of current issues and to inspire them to take part in the fight for our country.", 
       artist: "Roselyn Sana", 
       medium: "Digital Drawing", 
       category: "visual", 
       year: "2025", 
       type: "image",
       image: "assets/visual arts/labrador1.webp" },
    
    {title: "Nakikita kita I.", 
     category: "Visual Arts", 
     description: "Nakikita Kita I is about a man who fights to resist two hands covering his eyes. It is meant to symbolize resistance of the oppressed against those in power, revealing the dark truth they force to hide from us. The artwork is a reflection of the artist's criticism of the very system responsible for shaping Philippine society, and how it fails to do so properly.", 
     artist: "Shawn Paolo Velasco", 
     medium: "Graphic Drawing", 
     category: "visual", 
     year: "2025", 
     type: "image",
     image: "assets/visual arts/velasco.webp" },
    
    { title: "Katakawan", 
     category: "Visual Arts", 
     description: "“Katawakan” uses an image of a pig to represent the corrupt politicians in our country. This editorial cartoon criticizes their greed and calls out the two-faced actions they make. In response to the recent issue in ghost flood control projects, the artwork points out why our funds are being spent on niche projects instead of being allocated towards more relevant and progressive projects. ", 
     artist: "Jad Paulo Boquiron", 
     medium: "Drawing", 
     category: "visual", 
     year: "2025", 
     type: "image",
     image: "assets/visual arts/boquiron.webp" },
    
    { title: "Resist, Revolt, Reclaim", 
     category: "Visual Arts",
     description: "As the title suggests, this artwork pushes us to resist corruption, revolt against injustice, and reclaim what is rightfully ours. With its striking red visuals, it conveys a powerful emotion which encourages viewers to take necessary actions and not just stand idly. The piece calls for a movement that helps challenge those who abuse their power, rising against cruelty, injustice, and corruption.", 
     artist: "Uriel Miguel Carbonell", 
     medium: "Digital Design", 
     category: "visual", 
     year: "2025", 
     type: "image",
     image: "assets/visual arts/carbonell.webp" },

    { title: "Buwaya sa Politiko", 
     category: "Literary Arts", 
     description: "Mga Buwaya sa Politika depicts important issues such as bureaucratic capitalism, nepotism, abuse of power, and the suffering of ordinary citizens through a Bicolano tigsik. It conveys the harsh reality of corruption while expressing the artist's frustration, concern for the youth and marginalized sectors, and desire for justice and reform. The poem functions as a social commentary and political critique, aiming to encourage citizens to be critical and speak out against injustice.", 
     artist: "Von Justin Estayani", 
     medium: "Digital Text", 
     category: "literature", 
     year: "2025", 
     type: "image",
     image: "assets/literary arts/estayani.webp" },

    { title: "Awit ng mga Inakay", 
     category: "Literary Arts", 
     description: "Awit ng mga Inakay is a poem focused on the contrast between the Filipino people as birds and the mandaragit, representing those in power. This literary piece uses symbolism in depicting the current state of our society with the dynamic between birds of prey and predatory birds. It serves to call out both people in power and those who choose to stay silent despite all that happened across time, pushing us to finally face the “Mandaragit” in our country.", 
     artist: "Ashley Nicole De Mesa", 
     medium: "Digital Text", 
     category: "literature", 
     year: "2025", 
     type: "image",
     image: "assets/literary arts/demesa.webp" },

    { 
       title: "Babala may Buaya", 
       category: "Literary Arts", 
       description: "The acrostic poem uses the image of buayas (crocodiles) as a metaphor to reveal the hidden danger of corrupt officials in positions of power. A buaya symbolizes someone who pretends to be calm or harmless but strikes when there's something to gain, just like a crocodile waits silently before attacking. By comparing leaders to predators, the poem shows how the nation's resources are exploited while the country suffer.", 
     artist: "Von Justin Estayani", 
       medium: "Digital Text", 
       category: "literature", 
       year: "2025", 
       type: "image",
       image: "assets/literary arts/isidro.webp" },

    { title: "The Battle Against Corruption: Bringing Back the Light", 
     category: "Literary Arts",
     description: "The acrostic poem uses the image of buayas (crocodiles) as a metaphor to reveal the hidden danger of corrupt officials in positions of power. A buaya symbolizes someone who pretends to be calm or harmless but strikes when there's something to gain, just like a crocodile waits silently before attacking. By comparing leaders to predators, the poem shows how the nation's resources are exploited while the country suffer.", 
     artist: "Yzan France Ramos",
     medium: "Digital Text", 
     category: "literature", 
     year: "2025", 
     image: "assets/literary arts/ramos.webp" },

    { title: "The Divided Flower", 
     category: "Applied Arts", 
     description: "This symbolic artwork of a flower represents two sides of government, one side being vibrant and thriving, the other showing decay and corruption. “The Divided Flower” shows that even something as pure as a flower can be corrupted—just as any system, no matter how beautiful, can be flawed when exploited. The art not only acts as decoration but also raises awareness through the artist's personal thoughts on leadership, honesty, and corruption.", 
     artist: "Joshua Napay", 
     medium: "Crafts", 
     ategory: "applied", 
     year: "2025", 
     type: "image",
     image: "assets/applied arts/napay.webp" },

    { title: "Nakikita kita II. ", 
     category: "Applied Arts", 
     description: "The artwork is focused on a girl whose eyes are covered with hands on top of her blindfolds. “Nakikita Kita II” tells us a message about seeing through the tricks, lies, and deception of the corrupt despite their elaborate attempts in keeping us within their grasp. It is a form of personal expression for the artist, transforming a piece of clothing into a means of spreading awareness against corruption and the people who oppress us.", 
     artist: "Shawn Paolo Velasco", 
     medium: "T-Shirt Print", 
     category: "applied", 
     year: "2025", 
     type: "image",
     image: "assets/applied arts/velasco1.webp" },

    { title: "Barong ng Buwaya", 
     category: "Applied Arts", 
     description: "The crocodiles in barong Tagalog represent corrupt officials hiding behind respectability, revealing how abuse of power leads to poverty and public suffering.", 
     artist: "Jomari Tan", 
     medium: "T-Shirt Print", 
     category: "applied", 
     year: "2025", 
     type: "image",
     image: "assets/applied arts/salvino1.webp" },

    { title: "Ginintuang Kasinungalingan", 
     category: "Applied Arts", 
     description: " As an applied artwork, it serves as wearable advocacy that expresses political beliefs, spreads social awareness, and transforms clothing into a moving canvas for protest and dialogue.", 
     artist: "Jomari Tan", 
     medium: "T-Shirt Print", 
     category: "applied", 
     year: "2025", 
     type: "image",
     image: "assets/applied arts/salvino2.webp" },

    { 
       title: "Baon ng Buwaya", 
     category: "Applied Arts", 
       description: "The artwork addresses political corruption in the Philippines through an allegorical design that uses crocodiles as symbols of greed, power abuse, and exploitation", 
     artist: "Jomari Tan", 
       medium: "T-Shirt Print", 
       category: "applied", 
       year: "2025", 
       type: "image",
       image: "assets/applied arts/salvino.webp" }, 
    // Example direct video link (MP4)
    {
        title: "Spoken Word: Hustisya",
        category: "Performance Arts",
        description: "Isang powerful spoken word performance tungkol sa pangangailangan ng hustisya at accountability.",
        artist: "Maya Reyes",
        medium: "Spoken Word Poetry",
        category: "performance",
        year: "2024",
        type: "video",
        videoType: "direct",
        videoUrl: "https://drive.google.com/file/d/15wRUqqS9TA7iJqoPVY9jJq6zQ6ZOaExx", // Direct video URL
        thumbnail: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1200&q=80"
    },
    {
        title: "Tinig ng Masa: Dokumentaryo",
        category: "Performance Arts",
        description: "Isang makapangyarihang dokumentaryo tungkol sa mga kwento ng mga taong naapektuhan ng katiwalian sa gobyerno.",
        artist: "FilmKolektibo",
        medium: "Documentary Film",
        category: "performance",
        year: "2024",
        type: "video",
        videoType: "googledrive",
        videoId: "15wRUqqS9TA7iJqoPVY9jJq6zQ6ZOaExx", // Extract this from your Google Drive link
        thumbnail: "https://images.unsplash.com/photo-1574267432644-f7eeb86d49a4?w=1200&q=80"
    }

];

const grid = document.getElementById('galleryGrid');

function truncateText(text, maxChars, reserve = 30) {
    // text: the string
    // maxChars: maximum visible chars including '...more'
    // reserve: chars to reserve for '...more' (default 10)

    if (!text || typeof text !== 'string') return { short: '', long: false };
    if (text.length <= maxChars) return { short: text, long: false };

    // cut to maxChars - reserve so we have room for '...more'
    let cut = text.slice(0, maxChars - reserve);

    // backup to last space to avoid breaking words
    const lastSpace = cut.lastIndexOf(" ");
    if (lastSpace > 0) {
        cut = cut.slice(0, lastSpace);
    }

    // trim trailing punctuation/space
    cut = cut.replace(/[\s\.,;–—:]+$/, "");

    return { short: cut, long: true };
}
function makeCard(a, i) {
    const el = document.createElement('article');
    el.className = 'card';
    el.dataset.index = i;
    el.dataset.category = a.category;
    el.tabIndex = 0;

    // Truncate description for card view
    const truncated = truncateText(a.description || '', 160);
    const descHtml = truncated.long
        ? `${truncated.short}<span class="dots-and-more">...<span class="card-more" role="button" tabindex="0" aria-label="Read more">more</span></span>`
        : `${truncated.short}`;

    // Determine media source
    let mediaHTML = '';
    if (a.type === 'video') {
        // Show thumbnail with play button overlay for videos
        const thumbnail = a.thumbnail || 'https://images.unsplash.com/photo-1574267432644-f7eeb86d49a4?w=1200&q=80';
        mediaHTML = `
            <img loading="lazy" src="${thumbnail}" alt="${a.title}">
            <div class="video-play-overlay">
                <svg viewBox="0 0 24 24" width="60" height="60" fill="white">
                    <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.7)" stroke="white" stroke-width="1.5"/>
                    <path d="M9 8l8 4-8 4V8z" fill="white"/>
                </svg>
            </div>
        `;
    } else {
        // Regular image
        mediaHTML = `<img loading="lazy" src="${a.image}" alt="${a.title}">`;
    }

    el.innerHTML = `
        <div class="thumb">
            <div class="art-category-badge">${a.category}</div>
            ${mediaHTML}
        </div>

        <div class="card-body">
            <div class="title">${truncateText(a.title || '', 42).short}</div>
            <div class="artist-name">ni ${a.artist || ''}</div>

            <div class="desc">
                ${descHtml}
            </div>

            <div class="meta"><span>${a.medium || ''}</span><span> · ${a.year || ''}</span></div>
        </div>
    `;

    // Card click opens modal
    el.addEventListener('click', async (e) => {
        if (e.target.closest('.card-more')) return;
        loadModalData(i);
        openModal(i);
    });

    return el;
}


window.addEventListener("load", async () => {
    await loadInitialData();
    renderAll();
});


function renderAll() {
    grid.innerHTML = '';
    artworks.forEach((a, i) => grid.appendChild(makeCard(a, i)));
}

renderAll();
// Convert DB row to your UI shape
function dbCommentToUI(c) {
    return {
        text: c.body,
        ts: new Date(c.created_at).getTime(),
        name: c.username || 'Anonymous'
    };
}

// Fetch like count
async function fetchLikeCount(i) {
    const { count, error } = await sb
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("artwork_index", i);

    if (error) {
        console.error("fetchLikeCount error", error);
        return 0;
    }

    return count || 0;
}


// Realtime handlers
function onRemoteComment(newRow) {
    const idx = newRow.artwork_index;
    sessionComments[idx] = sessionComments[idx] || [];

    // Remove temporary comment if exists
    sessionComments[idx] = sessionComments[idx].filter(c => !String(c.id).startsWith("temp-"));

    // Prevent double insert (if somehow already added)
    const exists = sessionComments[idx].some(c => c.id === newRow.id);
    if (exists) return;

    // Add real comment
    sessionComments[idx].push(dbCommentToUI(newRow));

    if (currentIndex === idx) renderComments(idx);
}



function onRemoteLike(newRow) {
    if (currentIndex !== null) {
        fetchLikeCount(currentIndex).then(count => {
            modalLikeCount.textContent = `${count} like${count !== 1 ? 's' : ''}`;
        });
    }
}

// Subscribe to realtime
subscribeRealtime(onRemoteComment, onRemoteLike);

// Load modal data
async function loadModalData(i) {
    sessionComments[i] = await loadCommentsFromDB(i);

    const count = await fetchLikeCount(i);
    modalLikeCount.textContent = `${count} like${count !== 1 ? 's' : ''}`;

    const { data: userLike } = await sb
        .from('likes')
        .select('id')
        .match({ artwork_index: i, user_id: GUEST_ID })
        .limit(1)
        .maybeSingle();

    if (userLike) sessionLikes.add(i);
    else sessionLikes.delete(i);
}

// allow clicking the small 'more' inside card to open the modal without letting the click bubble incorrectly
// delegate 'more' clicks from grid
grid.addEventListener('click', async (e) => {
    const more = e.target.closest('.card-more');
    if (!more) return;
    e.stopPropagation();
    const card = more.closest('.card');
    if (!card) return;

    const idx = Number(card.dataset.index);
    if (Number.isNaN(idx)) return;

    loadModalData(idx);   // <--- IMPORTANT FIX
    openModal(idx);             // <--- open AFTER data is loaded
});


// keyboard accessibility for .card-more (space/enter)
grid.addEventListener('keydown', (e) => {
    const focused = document.activeElement;
    if (focused && focused.classList && focused.classList.contains('card-more')) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const card = focused.closest('.card');
            const idx = Number(card.dataset.index);
            if (!Number.isNaN(idx)) openModal(idx);
        }
    }
});


function applyFilter(filter) {
    const cards = Array.from(grid.children);
    cards.forEach(c => {
        const matches = (filter === 'all') || c.dataset.category === filter;
        c.style.display = matches ? "flex" : "none";
    });
}

document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    applyFilter(t.dataset.filter || 'all');
}));

/* ===========================
   Modal & interactions (V3)
   =========================== */
const sessionCommented = new Set();
const modal = document.getElementById('modal');
const modalLeft = document.getElementById('modalLeft');
const modalImg = document.getElementById('modalImg');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const closeModalBtn = document.getElementById('closeModal');
const modalDescription = document.getElementById('modalDescription');
const likeBtn = document.getElementById('likeBtn');
const shareBtn = document.getElementById('shareBtn');
const focusComment = document.getElementById('focusComment');
const commentsArea = document.getElementById('commentsArea');
const commentInput = document.getElementById('commentInput');
const postComment = document.getElementById('postComment');
const modalLikeCount = document.getElementById('modalLikeCount');


let currentIndex = null;
const sessionComments = {};
const sessionLikes = new Set();

function openModal(i) {
    const a = artworks[i];
    currentIndex = i;

    // Clear previous media
    modalImg.style.display = 'none';
    const existingVideo = modalLeft.querySelector('.video-container');
    if (existingVideo) {
        existingVideo.remove();
    }

    // Handle video or image
    if (a.type === 'video') {
        modalImg.style.display = 'none';

        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-container';

        let videoHTML = '';

        if (a.videoType === 'youtube') {
            videoHTML = `
                <iframe 
                    src="https://www.youtube.com/embed/${a.videoId}?autoplay=0&rel=0&modestbranding=1" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen
                    title="${a.title}">
                </iframe>
            `;
        } else if (a.videoType === 'vimeo') {
            videoHTML = `
                <iframe 
                    src="https://player.vimeo.com/video/${a.videoId}?title=0&byline=0&portrait=0" 
                    frameborder="0" 
                    allow="autoplay; fullscreen; picture-in-picture" 
                    allowfullscreen
                    title="${a.title}">
                </iframe>
            `;
        } else if (a.videoType === 'googledrive') {
            videoHTML = `
                <iframe 
                    src="https://drive.google.com/file/d/${a.videoId}/preview" 
                    frameborder="0" 
                    allow="autoplay; encrypted-media" 
                    allowfullscreen
                    title="${a.title}">
                </iframe>
            `;
        } else if (a.videoType === 'direct') {
            videoHTML = `
                <video controls controlsList="nodownload" preload="metadata">
                    <source src="${a.videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
        }

        videoContainer.innerHTML = videoHTML;
        modalLeft.insertBefore(videoContainer, modalLeft.firstChild);
    } else {
        // Regular image
        modalImg.style.display = 'block';
        modalImg.src = a.image || '';
        modalImg.alt = a.title || '';
    }

    modalTitle.textContent = a.title || '';

    const full = a.description || '';
    const short = truncateText(full, 150, 30);

    modalDesc.innerHTML = '';
    modalDesc.classList.remove('pushed-down');

    if (short.long) {
        const shortSpan = document.createElement('span');
        shortSpan.className = 'modal-short';
        shortSpan.textContent = short.short + '...';

        const moreBtn = document.createElement('span');
        moreBtn.className = 'modal-more';
        moreBtn.textContent = 'more';
        moreBtn.role = 'button';
        moreBtn.tabIndex = 0;

        const fullSpan = document.createElement('span');
        fullSpan.className = 'modal-full';
        fullSpan.style.display = 'none';
        fullSpan.textContent = full;

        modalDesc.appendChild(shortSpan);
        modalDesc.appendChild(moreBtn);
        modalDesc.appendChild(fullSpan);

        const toggle = () => {
            const isHidden = fullSpan.style.display === 'none' || fullSpan.style.display === '';
            if (isHidden) {
                fullSpan.style.display = 'inline';
                shortSpan.style.display = 'none';
                moreBtn.textContent = 'show less';
                modalDesc.classList.add('expanded');
                if (fullSpan.nextSibling !== moreBtn) {
                    fullSpan.parentNode.insertBefore(moreBtn, fullSpan.nextSibling);
                }
            } else {
                fullSpan.style.display = 'none';
                shortSpan.style.display = 'inline';
                moreBtn.textContent = 'more';
                modalDesc.classList.remove('expanded');
                if (shortSpan.nextSibling !== moreBtn) {
                    shortSpan.parentNode.insertBefore(moreBtn, shortSpan.nextSibling);
                }
            }
        };

        moreBtn.onclick = toggle;
        moreBtn.onkeydown = (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                toggle();
            }
        };
    } else {
        modalDesc.textContent = full;
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.querySelector('main').style.overflow = 'hidden';
    modalLikeCount.textContent = "- likes";

    updateLikeUI();
    renderComments(i);

    const commentsActive = sessionCommented.has(i);
    const addCommentSection = document.querySelector('.add-comment');

    if (commentsActive) {
        modalDescription.classList.add('active');
        document.querySelector('.modal-card').classList.add('comments-active');
        setTimeout(() => {
            commentsArea.classList.add('active');
            addCommentSection.classList.add('active');
        }, 50);
    } else {
        modalDescription.classList.remove('active');
        document.querySelector('.modal-card').classList.remove('comments-active');
        commentsArea.classList.remove('active');
        addCommentSection.classList.remove('active');
    }
}




function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.querySelector('main').style.overflow = 'auto';

    // Stop any playing videos
    const videoContainer = modalLeft.querySelector('.video-container');
    if (videoContainer) {
        const iframe = videoContainer.querySelector('iframe');
        if (iframe) {
            // Reset iframe src to stop video
            const src = iframe.src;
            iframe.src = '';
            iframe.src = src;
        }
        const video = videoContainer.querySelector('video');
        if (video) {
            video.pause();
            video.currentTime = 0;
        }
    }

    // Reset comment state when closing modal
    if (currentIndex !== null) {
        sessionCommented.delete(currentIndex);
        updateCommentUI();

        const addCommentSection = document.querySelector('.add-comment');
        modalDescription.classList.remove('active');
        document.querySelector('.modal-card').classList.remove('comments-active');
        commentsArea.classList.remove('active');
        addCommentSection.classList.remove('active');
    }

    currentIndex = null;
}
// Mobile: Touch anywhere on modal-left to close comments
(function setupMobileImageTapToCloseComments() {
    let tapStartY = 0;
    let wasDragging = false;

    function handleTapStart(e) {
        tapStartY = e.touches[0].clientY;
        wasDragging = false;
    }

    function handleTapMove(e) {
        const currentY = e.touches[0].clientY;
        if (Math.abs(currentY - tapStartY) > 10) {
            wasDragging = true;
        }
    }

    function closeCommentsOnMobile(e) {
        // Only work on mobile
        if (window.innerWidth > 700) return;

        // Don't close if this was a drag gesture
        if (wasDragging) return;

        // Don't close if tapping on video controls
        if (e.target.closest('.video-container')) return;

        e.stopPropagation();

        // Only close comments if they're open
        if (currentIndex !== null && sessionCommented.has(currentIndex)) {
            sessionCommented.delete(currentIndex);
            updateCommentUI();

            const addCommentSection = document.querySelector('.add-comment');
            modalDescription.classList.remove('active');
            document.querySelector('.modal-card').classList.remove('comments-active');
            commentsArea.classList.remove('active');
            addCommentSection.classList.remove('active');
        }
    }

    modalLeft.addEventListener('touchstart', handleTapStart, { passive: true });
    modalLeft.addEventListener('touchmove', handleTapMove, { passive: true });
    modalLeft.addEventListener('touchend', closeCommentsOnMobile);

    modalImg.addEventListener('touchstart', handleTapStart, { passive: true });
    modalImg.addEventListener('touchmove', handleTapMove, { passive: true });
    modalImg.addEventListener('touchend', closeCommentsOnMobile);
})();

closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
modalImg.addEventListener('click', (e) => { e.stopPropagation(); });

(function setupMobileDrag() {
    if (window.innerWidth > 700) return; // Only for mobile

    const modalRight = document.querySelector('.modal-right');
    const modalRightContent = document.querySelector('.modal-right-content');
    const modalCard = document.querySelector('.modal-card');
    const addCommentSection = document.querySelector('.add-comment');

    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let initialScroll = 0;
    let wasCommentOpen = false;

    function handleTouchStart(e) {
        const touch = e.touches[0];
        const rect = modalRight.getBoundingClientRect();

        // Check if touch is on scrollable elements that need scrolling
        const target = e.target;
        const commentsEl = target.closest('.comments');
        const modalDescEl = target.closest('.modal-desc');
        const inputEl = target.closest('.add-comment input');

        // Allow scrolling in comments if it has scrollable content
        if (commentsEl && commentsEl.scrollHeight > commentsEl.clientHeight) {
            return;
        }

        // Allow scrolling in modal-desc if it has scrollable content
        if (modalDescEl && modalDescEl.scrollHeight > modalDescEl.clientHeight) {
            return;
        }

        // Don't drag when typing in input
        if (inputEl) return;

        startY = touch.clientY;
        currentY = startY;
        isDragging = true;
        initialScroll = contentScroll;
        wasCommentOpen = currentIndex !== null && sessionCommented.has(currentIndex);
        modalRight.classList.add('dragging');

        // Remove transitions during drag for smooth following
        modalRight.style.transition = 'none';
        modalRightContent.style.transition = 'none';
    }

    function handleTouchMove(e) {
        if (!isDragging) return;

        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;

        // Dragging down
        if (deltaY > 0) {
            // If comments are open, close them by dragging down
            if (wasCommentOpen) {
                const resistance = Math.min(deltaY * 0.5, 200);
                modalRight.style.transform = `translateY(${resistance}px)`;
                e.preventDefault();
            } else {
                // Normal drag down (close modal)
                const resistance = Math.min(deltaY * 0.5, 200);
                modalRight.style.transform = `translateY(${resistance}px)`;
                e.preventDefault();
            }
        }
        // Dragging up - reveal comments
        else if (deltaY < 0 && initialScroll === 0) {
            const dragDistance = Math.abs(deltaY);
            const resistance = Math.min(dragDistance * 0.5, 300);
            modalRight.style.transform = `translateY(-${resistance}px)`;
            e.preventDefault();
        }
    }

    function handleTouchEnd(e) {
        if (!isDragging) return;

        const deltaY = currentY - startY;
        isDragging = false;
        modalRight.classList.remove('dragging');

        // Re-enable transitions for smooth snap with longer duration
        modalRight.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1)';

        // Swipe down > 120px = close modal (if comments weren't open)
        if (deltaY > 120 && !wasCommentOpen) {
            // Animate out before closing
            modalRight.style.transform = 'translateY(100%)';
            setTimeout(() => {
                modalRight.style.transform = '';
                modalRight.style.transition = '';
                closeModal();
            }, 500);
        }
        // Swipe down > 100px = close comments (if comments were open)
        else if (deltaY > 100 && wasCommentOpen) {
            // Close comments - snap back to closed position
            sessionCommented.delete(currentIndex);
            updateCommentUI();

            modalDescription.classList.remove('active');
            modalCard.classList.remove('comments-active');
            commentsArea.classList.remove('active');
            addCommentSection.classList.remove('active');

            modalRight.style.transform = 'translateY(0)';
        }
        // Swipe up > 100px = fully open comments (reduced threshold for easier trigger)
        else if (deltaY < -100 && currentIndex !== null) {
            // Add to session and update UI
            sessionCommented.add(currentIndex);
            updateCommentUI();

            // Show comment sections
            modalDescription.classList.add('active');
            modalCard.classList.add('comments-active');
            commentsArea.classList.add('active');
            addCommentSection.classList.add('active');

            // Slide up to reveal comments
            modalRight.style.transform = 'translateY(0px)';

            // Focus input after animation
            setTimeout(() => {
                commentInput.focus();
            }, 550);
        }
        // Not enough drag - snap back
        else {
            if (wasCommentOpen || sessionCommented.has(currentIndex)) {
                // Snap to open position showing comments
                modalRight.style.transform = 'translateY(0px)';
            } else {
                // Snap to closed position
                modalRight.style.transform = 'translateY(0)';

                modalDescription.classList.remove('active');
                modalCard.classList.remove('comments-active');
                commentsArea.classList.remove('active');
                addCommentSection.classList.remove('active');
            }
        }

        // Clean up after transition
        setTimeout(() => {
            modalRight.style.transition = '';
        }, 500);

        currentY = 0;
        startY = 0;
    }

    modalRight.addEventListener('touchstart', handleTouchStart, { passive: true });
    modalRight.addEventListener('touchmove', handleTouchMove, { passive: false });
    modalRight.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Re-initialize on window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 700) {
            modalRight.removeEventListener('touchstart', handleTouchStart);
            modalRight.removeEventListener('touchmove', handleTouchMove);
            modalRight.removeEventListener('touchend', handleTouchEnd);
        }
    });
})();

(function setupMobileDragLeft() {
    if (window.innerWidth > 700) return; // Only for mobile

    const modalLeft = document.querySelector('.modal-left');
    const modalCard = document.querySelector('.modal-card');

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    function handleTouchStart(e) {
        const touch = e.touches[0];
        startY = touch.clientY;
        currentY = startY;
        isDragging = true;

        modalCard.classList.add('dragging');
        modalCard.style.transition = 'none';
    }

    function handleTouchMove(e) {
        if (!isDragging) return;

        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;

        if (deltaY > 0) {
            // Drag whole card down with resistance
            const resistance = Math.min(deltaY * 0.55, window.innerHeight);
            modalCard.style.transform = `translateY(${resistance}px)`;
            e.preventDefault();
        }
    }

    function finishBounceBack(element) {
        element.style.transition = 'transform 240ms cubic-bezier(.25,.9,.3,1)';
        element.style.transform = 'translateY(-18px)';
        setTimeout(() => {
            element.style.transform = 'translateY(0)';
            setTimeout(() => { element.style.transition = ''; }, 260);
        }, 60);
    }

    function handleTouchEnd() {
        if (!isDragging) return;

        const deltaY = currentY - startY;
        isDragging = false;
        modalCard.classList.remove('dragging');

        if (deltaY > 120) {
            // Close modal if dragged far enough
            modalCard.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1)';
            modalCard.style.transform = 'translateY(100%)';
            setTimeout(() => {
                modalCard.style.transform = '';
                modalCard.style.transition = '';
                closeModal();
            }, 500);
        } else {
            // Bounce back if not enough drag
            finishBounceBack(modalCard);
        }

        currentY = 0;
        startY = 0;
    }

    modalLeft.addEventListener('touchstart', handleTouchStart, { passive: true });
    modalLeft.addEventListener('touchmove', handleTouchMove, { passive: false });
    modalLeft.addEventListener('touchend', handleTouchEnd, { passive: true });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 700) {
            modalLeft.removeEventListener('touchstart', handleTouchStart);
            modalLeft.removeEventListener('touchmove', handleTouchMove);
            modalLeft.removeEventListener('touchend', handleTouchEnd);
        }
    });
})();




// Track how many times the user tried to unlike
let unloveAttempts = 0;

const unloveMessages = [
    "you can't truly unlove someone right?",
    "hmm, trust me you can't unlove some...thing",
    "really? you can't unlove someone, you just get used to it",
    "come on… your heart knows the truth",
    "nope. nice try. love sticks."
];
// 🎉 CUSTOM POPUP (replaces alert)
// small helper to show the custom popup (restarts animation by toggling class)
function showPopup(msg) {
    const popup = document.getElementById("popup");
    if (!popup) {
        alert(msg);
        return;
    }

    // Add emoji/icon based on message
    const isLike = msg.includes('Liked') || msg.includes('❤️');
    popup.className = 'custom-popup' + (isLike ? ' liked' : '');
    popup.textContent = msg;

    // Restart animation
    popup.classList.remove("show");
    void popup.offsetWidth;
    popup.classList.add("show");

    // Auto-hide after 2s
    clearTimeout(popup._hideTimeout);
    popup._hideTimeout = setTimeout(() => {
        popup.classList.remove("show");
    }, 2000);
}

// updated like button behavior (keeps DB insert/unique-constraint protection)
likeBtn.addEventListener("click", async () => {
    if (currentIndex === null) return;

    const isLiked = sessionLikes.has(currentIndex);

    try {
        if (isLiked) {
            // user tried to unlike — play shake + random message but keep it liked visually
            unloveAttempts++;
            const msg = unloveMessages[Math.floor(Math.random() * unloveMessages.length)];

            // show custom popup instead of alert
            showPopup(msg);

            // add shake class then remove after animation
            likeBtn.classList.add("shake");
            setTimeout(() => likeBtn.classList.remove("shake"), 380);

            // ensure the 'liked' visual state remains
            likeBtn.classList.add("liked");
        } else {
            // Real LIKE — insert to DB and update session set
            await addLikeToDB(currentIndex);
            sessionLikes.add(currentIndex);
            unloveAttempts = 0;

            // visual feedback
            likeBtn.classList.add("liked");
            showPopup("Liked ❤️");

            // small scale pop (optional)
            likeBtn.style.transition = "transform .18s ease";
            likeBtn.style.transform = "scale(1.18)";
            setTimeout(() => { likeBtn.style.transform = ""; }, 180);
        }

        // refresh like count and aria state
        await updateLikeUI();

    } catch (err) {
        console.error("Like toggle failed:", err);
        showPopup("Something went wrong.");
    }
});


async function updateLikeUI() {
    if (currentIndex === null) return;

    const liked = sessionLikes.has(currentIndex);

    // Button visuals
    likeBtn.classList.toggle("liked", liked);
    likeBtn.classList.toggle("active", liked);
    likeBtn.setAttribute("aria-pressed", liked);

    // Get real count from Supabase
    const count = await fetchLikeCount(currentIndex);

    // Update UI text
    modalLikeCount.textContent = `${count} like${count !== 1 ? "s" : ""}`;
}



// Share button: copy link to clipboard (hash + index)
shareBtn.addEventListener('click', async () => {
    if (currentIndex === null) return;
    const url = location.href.split('#')[0] + '#art-' + currentIndex;

    const svg = shareBtn.querySelector('svg');
    const originalHTML = svg.outerHTML;

    try {
        await navigator.clipboard.writeText(url);

        // Replace with checkmark
        svg.outerHTML = `
            <svg class="icon-share active" viewBox="0 0 24 24" width="28" height="28">
                <path fill="currentColor" d="M20 6L9 17l-5-5 2-2 3 3 9-9z"/>
            </svg>`;

        const originalTitle = shareBtn.title;
        shareBtn.title = 'Nakopya na';

        // Reset after 1.5 seconds
        setTimeout(() => {
            const currentSvg = shareBtn.querySelector('svg');
            if (currentSvg) {
                currentSvg.outerHTML = originalHTML;
            }
            shareBtn.title = originalTitle;
        }, 1500);
    } catch (e) {
        alert('Hindi makopya - narito ang link: ' + url);
    }
});

// Comment button behavior (toggle focus/highlight)
// Comment button behavior (toggle focus/highlight)
focusComment.addEventListener('click', () => {
    if (currentIndex === null) return;

    const addCommentSection = document.querySelector('.add-comment');
    const modalRight = document.querySelector('.modal-right');

    if (sessionCommented.has(currentIndex)) {
        // Close comments
        sessionCommented.delete(currentIndex);
        updateCommentUI();

        modalDescription.classList.remove('active');
        document.querySelector('.modal-card').classList.remove('comments-active');
        commentsArea.classList.remove('active');
        addCommentSection.classList.remove('active');

        // Smooth animation back to closed position on mobile
        if (window.innerWidth <= 700) {
            modalRight.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1)';
            modalRight.style.transform = 'translateY(0)';
            setTimeout(() => {
                modalRight.style.transition = '';
            }, 500);
        }
    } else {
        // Open comments
        sessionCommented.add(currentIndex);
        updateCommentUI();

        modalDescription.classList.add('active');
        document.querySelector('.modal-card').classList.add('comments-active');

        setTimeout(() => {
            commentsArea.classList.add('active');
            addCommentSection.classList.add('active');

            // Smooth animation to reveal comments on mobile
            if (window.innerWidth <= 700) {
                modalRight.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1)';
                modalRight.style.transform = 'translateY(0px)';
                setTimeout(() => {
                    modalRight.style.transition = '';
                }, 500);
            }
        }, 50);

        // Focus input after animation completes
        setTimeout(() => {
            commentInput.focus();
        }, 600);
    }
});

function updateCommentUI() {
    const commented = currentIndex !== null && sessionCommented.has(currentIndex);
    const commentIcon = focusComment.querySelector('svg');
    if (commentIcon) {
        commentIcon.classList.toggle('active', commented);
    }
    focusComment.classList.toggle('active', commented);
    focusComment.setAttribute('aria-pressed', String(Boolean(commented)));
}

/* ===========================
   Comments engine (V3)
   =========================== */
// store comments as objects: { text, ts, name }
function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 10) return 'just now';
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24); return `${d}d`;
}

function createCommentNode(c) {
    const row = document.createElement('div');
    row.className = 'comment-row';

    const body = document.createElement('div');
    body.className = 'comment-body';

    const meta = document.createElement('div');
    meta.className = 'comment-meta';

    const u = document.createElement('span');
    u.className = 'u';
    u.textContent = c.name || 'Anonymous';

    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = timeAgo(c.ts);

    meta.appendChild(u);
    meta.appendChild(time);

    const text = document.createElement('div');
    text.className = 'comment-text';
    text.textContent = c.text;

    body.appendChild(meta);
    body.appendChild(text);

    row.appendChild(body);

    return { row, timeElem: time };
}

function renderComments(index) {
    const list = sessionComments[index] || [];
    commentsArea.innerHTML = '';
    if (!list.length) {
        const placeholder = document.createElement('div');
        placeholder.className = 'comment-row';
        placeholder.style.opacity = 1; // show immediately

        const b = document.createElement('div'); b.className = 'comment-body';
        const meta = document.createElement('div'); meta.className = 'comment-meta';
        const u = document.createElement('span'); u.className = 'u'; u.textContent = 'Anonymous';
        const time = document.createElement('span'); time.className = 'time'; time.textContent = '';
        meta.appendChild(u); meta.appendChild(time);

        const txt = document.createElement('div'); txt.className = 'comment-text';
        txt.textContent = 'Walang komento pa â€“ ikaw muna ang mag-iwan.';

        b.appendChild(meta); b.appendChild(txt);
        placeholder.appendChild(b);

        commentsArea.appendChild(placeholder);
        return;
    }


    list.forEach(c => {
        const { row, timeElem } = createCommentNode(c);
        commentsArea.appendChild(row);
        // live update time every 30s
        setInterval(() => { timeElem.textContent = timeAgo(c.ts); }, 30000);
    });
    // scroll to bottom
    commentsArea.scrollTop = commentsArea.scrollHeight;
}

postComment.addEventListener('click', async () => {
    const txt = commentInput.value.trim();
    if (!txt || currentIndex === null) return;

    // Get username and avatar from localStorage
    let username = localStorage.getItem('guest_display_name_v1') || 'Anonymous';
    let avatar = localStorage.getItem('guest_avatar_v1') || '👤';

    // Ensure Anonymous users have proper display
    if (!username || username === 'null') {
        username = 'Anonymous';
    }

    // Optimistic UI: update local session immediately
    sessionComments[currentIndex] = sessionComments[currentIndex] || [];
    const tempId = "temp-" + Math.random().toString(36).slice(2);
    const obj = { id: tempId, text: txt, ts: Date.now(), name: username, avatar: avatar };
    sessionComments[currentIndex].push(obj);
    sessionCommented.add(currentIndex);
    updateCommentUI();
    commentInput.value = '';
    renderComments(currentIndex);

    // Persist to Supabase
    try {
        if (sb) {
            await postCommentToDB(currentIndex, username, txt);
        }
    } catch (err) {
        console.error('Failed to save comment to DB', err);
    }
});


commentInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); postComment.click(); } });

// initial render (empty)
// renderComments will be called on modal open

/* ===========================
   Scroll & nav behavior
   =========================== */
const main = document.querySelector('main');
const topNav = document.getElementById('topNav');
const hero = document.getElementById('hero');
const nextSection = document.getElementById('collections');

const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.intersectionRatio > 0.75) {
            topNav.classList.add('hidden');
        } else {
            topNav.classList.remove('hidden');
        }
    });
}, {
    root: main,
    threshold: [0, 0.25, 0.5, 0.75, 1.0]
});

obs.observe(hero);

// Nav scroll detection
main.addEventListener('scroll', () => {
    if (main.scrollTop > 50) {
        topNav.classList.add('scrolled');
    } else {
        topNav.classList.remove('scrolled');
    }
});
// Hero -> guided scroll to next (wheel/touch are attached to main)
let locking = false;

function lockScrollToNext() {
    if (locking) return;
    if (main.scrollTop > 40) return;
    locking = true;
    const heroInner = document.getElementById('homeSection');
    heroInner.classList.add('animated');
    topNav.classList.add('hidden');
    nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
        locking = false;
        heroInner.classList.remove('animated');
    }, 900);
}

main.addEventListener('wheel', (e) => {
    if (main.scrollTop > 60) return;
    if (Math.abs(e.deltaY) < 6) return;
    if (e.deltaY > 0) {
        e.preventDefault();
        lockScrollToNext();
    }
}, { passive: false });

let touchStartY = null;
main.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
main.addEventListener('touchend', e => {
    if (!touchStartY) return;
    const dy = touchStartY - (e.changedTouches[0].clientY);
    if (main.scrollTop <= 60 && dy > 40) lockScrollToNext();
    touchStartY = null;
}, { passive: true });

document.getElementById('discoverBtn').addEventListener('click', () => lockScrollToNext());

/* ===========================
   Hero frame fullscreen
   =========================== */
const heroFrame = document.getElementById('heroFrame');
const heroFrameOverlay = document.getElementById('heroFrameOverlay');
const heroFrameFullImg = document.getElementById('heroFrameFullImg');
const heroImg = heroFrame.querySelector('img');

// Add spinning animation that stops after 60 seconds
if (heroFrame) {
    console.log('Starting hero frame spin');
    heroFrame.classList.add('spinning');
    setTimeout(() => {
        console.log('Stopping hero frame spin');
        heroFrame.classList.remove('spinning');
    }, 60000); // 60 seconds
} else {
    console.error('heroFrame element not found');
}
heroFrame.addEventListener('click', () => {
    heroFrameFullImg.src = heroImg.src;
    heroFrameFullImg.alt = heroImg.alt;
    heroFrameOverlay.classList.add('open');
    heroFrameOverlay.setAttribute('aria-hidden', 'false');
    document.querySelector('main').style.overflow = 'hidden';
});

heroFrameOverlay.addEventListener('click', () => {
    heroFrameOverlay.classList.remove('open');
    heroFrameOverlay.setAttribute('aria-hidden', 'true');
    document.querySelector('main').style.overflow = 'auto';
});

// initialize nav state based on current hero visibility
setTimeout(() => {
    const heroRect = hero.getBoundingClientRect();
    const mainRect = main.getBoundingClientRect();
    const visibleHeight = Math.max(0, Math.min(heroRect.bottom, mainRect.bottom) - Math.max(heroRect.top, mainRect.top));
    const ratio = visibleHeight / heroRect.height;
    if (ratio > 0.75) topNav.classList.add('hidden'); else topNav.classList.remove('hidden');
}, 50);

// show year
document.getElementById('year').textContent = new Date().getFullYear();

// initial apply filter and ensure layout is correct on first paint
window.addEventListener('load', () => applyFilter('all'));

/* ===========================
   Accessibility: Escape to close things
   =========================== */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (heroFrameOverlay.classList.contains('open')) {
            heroFrameOverlay.classList.remove('open');
            heroFrameOverlay.setAttribute('aria-hidden', 'true');
            document.querySelector('main').style.overflow = 'auto';
        }
        if (modal.classList.contains('open')) closeModal();
    }
});

/* ===========================
   Hash linking to open art by index (optional)
   =========================== */
(function handleHashOpen() {
    const m = location.hash.match(/^#art-(\d+)$/);
    if (m) {
        const idx = parseInt(m[1], 10);
        if (!Number.isNaN(idx) && idx >= 0 && idx < artworks.length) {
            // wait until render
            setTimeout(() => openModal(idx), 200);
        }
    }
})();

// User Profile Setup
(function setupUserProfile() {
    const setupModal = document.getElementById('userSetupModal');
    const stayAnonymousBtn = document.getElementById('stayAnonymousBtn');
    const chooseNameBtn = document.getElementById('chooseNameBtn');
    const nameInputSection = document.getElementById('nameInputSection');
    const displayNameInput = document.getElementById('displayNameInput');
    const confirmNameBtn = document.getElementById('confirmNameBtn');
    const avatarOptions = document.querySelectorAll('.avatar-option');
    const userProfileDisplay = document.querySelector('.user-profile');

    let selectedAvatar = '👤';

    // Check if user has already set up profile
    const hasProfile = localStorage.getItem('user_profile_setup');
    if (hasProfile) {
        setupModal.classList.add('hidden');
        updateUserProfileDisplay();
        return;
    }

    // Anonymous option
    stayAnonymousBtn.addEventListener('click', () => {
        localStorage.setItem('user_profile_setup', 'true');
        localStorage.setItem('guest_display_name_v1', 'Anonymous');
        localStorage.setItem('guest_avatar_v1', '👤');
        setupModal.classList.add('hidden');
        updateUserProfileDisplay();
    });

    // Choose name option
    chooseNameBtn.addEventListener('click', () => {
        nameInputSection.style.display = 'flex';
        document.querySelector('.profile-options').style.display = 'none';
        displayNameInput.focus();
    });

    // Avatar selection
    avatarOptions.forEach(option => {
        option.addEventListener('click', () => {
            avatarOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectedAvatar = option.dataset.avatar;
        });
    });

    // Confirm name
    confirmNameBtn.addEventListener('click', () => {
        const name = displayNameInput.value.trim();
        if (!name) {
            displayNameInput.style.borderColor = 'var(--accent)';
            displayNameInput.placeholder = 'Please enter a name!';
            setTimeout(() => {
                displayNameInput.style.borderColor = '';
                displayNameInput.placeholder = 'Enter your display name';
            }, 2000);
            return;
        }

        localStorage.setItem('user_profile_setup', 'true');
        localStorage.setItem('guest_display_name_v1', name);
        localStorage.setItem('guest_avatar_v1', selectedAvatar);
        setupModal.classList.add('hidden');
        updateUserProfileDisplay();

        // Show welcome message
        setTimeout(() => {
            showPopup(`Welcome, ${name}! 🎉`);
        }, 300);
    });

    // Update the user profile icon in navbar
    function updateUserProfileDisplay() {
        const avatar = localStorage.getItem('guest_avatar_v1') || '👤';
        if (userProfileDisplay) {
            userProfileDisplay.textContent = avatar;
            userProfileDisplay.title = localStorage.getItem('guest_display_name_v1') || 'Anonymous';
        }
    }

    // Enter key support for name input
    displayNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmNameBtn.click();
        }
    });

})();
