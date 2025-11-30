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

// Optional: remove like (unlike)
async function removeLikeFromDB(artworkIndex) {
    if (!sb) return;
    const { data, error } = await sb
        .from('likes')
        .delete()
        .match({ artwork_index: artworkIndex, user_id: GUEST_ID });

    if (error) {
        console.error('Error deleting like:', error);
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
    { title: "Mga Mukha ng Katiwalian", category: "Visual Arts", description: "Isang mahusay na pagpipinta na naglalarawan ng mga mukha ng katiwalian sa ating lipunanIsang mahusay na pagpipinta na naglalarawan ng mga mukha ng katiwalian sa ating lipunanIsang mahusay na pagpipinta na naglalarawan ng mga mukha ng katiwalian sa ating lipunanIsang mahusay na pagpipinta na naglalarawan ng mga mukha ng katiwalian sa ating lipunanIsang mahusay na pagpipinta na naglalarawan ng mga mukha ng katiwalian sa ating lipunanIsang mahusay na pagpipinta na naglalarawan ng mga mukha ng katiwalian sa ating lipunanIsang mahusay na pagpipinta na naglalarawan ng mga mukha ng katiwalian sa ating lipunanIsang mahusay na pagpipinta na naglalarawan ng mga mukha ng katiwalian sa ating lipunanIsang mahusay na pagpipinta na naglalarawan ng mga mukha ng katiwalian sa ating lipunanIsang mahusay na pagpipinta na naglalarawan ng mga mukha ng katiwalian sa ating lipunanIsang mahusay na pagpipinta na naglalarawan ng mga mukha ng katiwalian sa ating lipunanIsang mahusay na pagpipinta na naglalarawan ng mga mukha ng katiwalian sa ating lipunanIsang mahusay na pagpipinta na naglalarawan ng mga mukha ng katiwalian sa ating lipunanIsang mahusay na pagpipinta na naglalarawan ng mga mukha ng katiwalian sa ating lipunanIsang mahusay na pagpipinta na naglalarawan ng mga mukha ng katiwalian sa ating lipunanIsang mahusay na pagpipinta na naglalarawan ng mga mukha ng katiwalian sa ating lipunan.", artist: "Maria Santos", medium: "Oil on Canvas", category: "visual", year: "2024", image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1200&q=80" },
    { title: "Sigaw ng Bayan", category: "Visual Arts", description: "Isang abstract na likhang sining na sumasalamin sa sigaw ng mga mamamayan laban sa karahasan at katiwalian.", artist: "Juan dela Cruz", medium: "Mixed Media", category: "visual", year: "2024", image: "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=1200&q=80" },
    { title: "Mga Tula ng Protesta", category: "Visual Arts", description: "Koleksyon ng mga tulang Tagalog na mga kwento ng mga taong lumalaban sa katiwalian.", artist: "Lualhati Rivera", medium: "Tula", category: "literature", year: "2024", image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&q=80" },
    { title: "Poster ng Pagbabago", category: "Visual Arts", description: "Isang makapangyarihang poster na naghihikayat ng pagbabago at pagtindig laban sa katiwalian.", artist: "Ana Cruz", medium: "Graphic Design", category: "applied", year: "2024", image: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=1200&q=80" },
    { title: "Dulang Bayan", category: "Visual Arts", description: "Isang teatro performance na naglalarawan ng mga epekto ng katiwalian sa buhay ng mga mamamayan.", artist: "Liwayway Tan", medium: "Teatro", category: "performance", year: "2024", image: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&q=80" }
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

    // truncate only for card view
    const truncated = truncateText(a.description || '', 160);

    // build desc string: only add dots + more WHEN truncated.long is true
    const descHtml = truncated.long
        ? `${truncated.short}<span class="dots-and-more">...<span class="card-more" role="button" tabindex="0" aria-label="Read more">more</span></span>`
        : `${truncated.short}`;

    el.innerHTML = `
        <div class="thumb">
            <div class="art-category-badge">${a.category}</div>
            <img loading="lazy" src="${a.image}" alt="${a.title}">
        </div>

        <div class="card-body">
            <div class="title">${truncateText(a.title || '', 42).short}</div>
            <div class="artist-name">ni ${a.artist || ''}</div>

            <div class="desc">
                ${descHtml}
            </div>

            <div class="meta"><span>${a.medium || ''}</span><span> Â· ${a.year || ''}</span></div>
        </div>
    `;

    // card click opens modal (but clicking the "more" should not trigger double work)
    el.addEventListener('click', (e) => {
        // if click came from card-more, let delegated handler handle it; otherwise open modal
        if (e.target.closest('.card-more')) return;
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
grid.addEventListener('click', (e) => {
    const more = e.target.closest('.card-more');
    if (!more) return;
    e.stopPropagation();
    const card = more.closest('.card');
    if (!card) return;
    const idx = Number(card.dataset.index);
    if (!Number.isNaN(idx)) openModal(idx);
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

    modalImg.src = a.image || '';
    modalImg.alt = a.title || '';
    modalTitle.textContent = a.title || '';

    const full = a.description || '';
    const short = truncateText(full, 150, 30); // 150 chars total, 10 reserved for '...more'

    // always reset modalDesc first
    modalDesc.innerHTML = '';
    modalDesc.classList.remove('pushed-down');

    if (short.long) {
        // create nodes so we can move the button around reliably
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

        // append in the initial (short) order: short + more + full(hidden)
        modalDesc.appendChild(shortSpan);
        modalDesc.appendChild(moreBtn);
        modalDesc.appendChild(fullSpan);

        // ensure any previous listeners don't leak: use a fresh function reference
        const toggle = () => {
            const isHidden = fullSpan.style.display === 'none' || fullSpan.style.display === '';
            if (isHidden) {
                // expand
                fullSpan.style.display = 'inline';
                shortSpan.style.display = 'none';
                moreBtn.textContent = 'show less';
                modalDesc.classList.add('expanded'); // ADD THIS LINE
                // move button after the full text to show "...show less"
                if (fullSpan.nextSibling !== moreBtn) {
                    fullSpan.parentNode.insertBefore(moreBtn, fullSpan.nextSibling);
                }
            } else {
                // collapse
                fullSpan.style.display = 'none';
                shortSpan.style.display = 'inline';
                moreBtn.textContent = 'more';
                modalDesc.classList.remove('expanded'); // ADD THIS LINE
                // move button back after shortSpan
                if (shortSpan.nextSibling !== moreBtn) {
                    shortSpan.parentNode.insertBefore(moreBtn, shortSpan.nextSibling);
                }
            }
        };

        // attach handlers
        moreBtn.onclick = toggle;
        moreBtn.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); } };
    } else {
        modalDesc.textContent = full;
    }

    // show modal and lock scroll
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.querySelector('main').style.overflow = 'hidden';

    updateLikeUI();
    renderComments(i);

    // Reset comment section state
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

    // Reset comment state when closing modal
    if (currentIndex !== null) {
        sessionCommented.delete(currentIndex);
        updateCommentUI();

        // Hide comment sections
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
    function closeCommentsOnMobile(e) {
        // Only work on mobile
        if (window.innerWidth > 700) return;

        e.stopPropagation();

        // Only close comments if they're open
        if (currentIndex !== null && sessionCommented.has(currentIndex)) {
            sessionCommented.delete(currentIndex);
            updateCommentUI();

            // Animate out comment sections
            const addCommentSection = document.querySelector('.add-comment');
            modalDescription.classList.remove('active');
            document.querySelector('.modal-card').classList.remove('comments-active');
            commentsArea.classList.remove('active');
            addCommentSection.classList.remove('active');
        }
    }

    // Listen on modal-left (the entire container)
    modalLeft.addEventListener('click', closeCommentsOnMobile);
    modalLeft.addEventListener('touchend', closeCommentsOnMobile);

    // Also listen on the image itself
    modalImg.addEventListener('click', closeCommentsOnMobile);
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

// Like button behavior (toggle)
likeBtn.addEventListener("click", async () => {
    if (currentIndex === null) return;

    const isLiked = sessionLikes.has(currentIndex);

    try {
        if (isLiked) {
            // UNLIKE
            await removeLikeFromDB(currentIndex);
            sessionLikes.delete(currentIndex);
        } else {
            // LIKE
            await addLikeToDB(currentIndex);
            sessionLikes.add(currentIndex);
        }

        // After DB confirms changes → update UI with correct data
        await updateLikeUI();

    } catch (err) {
        console.error("Like toggle failed:", err);
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

    // Temporarily use a username prompt or read from a small input field:
    let username = localStorage.getItem('guest_display_name_v1') || null;
    if (!username) {
        // optionally prompt once
        username = prompt("Enter a display name (optional):") || null;
        if (username) localStorage.setItem('guest_display_name_v1', username);
    }

    // Optimistic UI: update local session immediately
    sessionComments[currentIndex] = sessionComments[currentIndex] || [];
    const obj = { text: txt, ts: Date.now(), name: username || 'Anonymous' };
    sessionComments[currentIndex].push(obj);
    sessionCommented.add(currentIndex);
    updateCommentUI();
    renderComments(currentIndex);
    commentInput.value = '';
    commentsArea.scrollTop = commentsArea.scrollHeight;

    // Persist to Supabase
    try {
        if (sb) {
            await postCommentToDB(currentIndex, username, txt);
            // success — DB will broadcast via realtime and other clients will update.
        }
    } catch (err) {
        console.error('Failed to save comment to DB', err);
        // optionally show a toast: "Save failed, will retry"
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
