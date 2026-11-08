// --- 1. API Client Class ---
class APIClient {
    constructor() {
        this.baseURL = "https://www.themealdb.com/api/json/v1/1/";
    }

    async getMeals(query = '') {
        try {
            const res = await fetch(`${this.baseURL}search.php?s=${query}`);
            const data = await res.json();
            return data.meals || [];
        } catch (error) {
            return [];
        }
    }

    async getCategories() {
        try {
            const res = await fetch(`${this.baseURL}categories.php`);
            const data = await res.json();
            return data.categories || [];
        } catch (error) {
            return [];
        }
    }

    async getAreas() {
        try {
            const res = await fetch(`${this.baseURL}list.php?a=list`);
            const data = await res.json();
            return data.meals || [];
        } catch (error) {
            return [];
        }
    }

    async getMealsByCategory(category) {
        try {
            const res = await fetch(`${this.baseURL}filter.php?c=${category}`);
            const data = await res.json();
            return data.meals || [];
        } catch (error) {
            return [];
        }
    }

    async getMealsByArea(area) {
        try {
            const res = await fetch(`${this.baseURL}filter.php?a=${area}`);
            const data = await res.json();
            return data.meals || [];
        } catch (error) {
            return [];
        }
    }

    async getMealDetails(id) {
        try {
            const res = await fetch(`${this.baseURL}lookup.php?i=${id}`);
            const data = await res.json();
            return data.meals ? data.meals[0] : null;
        } catch (error) {
            return null;
        }
    }
}

// --- 2. Food Log Manager Class (LocalStorage) ---
class FoodLogManager {
    constructor() {
        this.storageKey = "nutriplan_food_log";
        this.goals = { calories: 2000, protein: 150, carbs: 250, fats: 70 };
    }

    getLogs() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
    }

    addLog(item) {
        const logs = this.getLogs();
        logs.push({
            id: Date.now(),
            name: item.name,
            calories: Number(item.calories) || 350,
            protein: Number(item.protein) || 20,
            carbs: Number(item.carbs) || 40,
            fats: Number(item.fats) || 10,
            date: new Date().toLocaleDateString()
        });
        localStorage.setItem(this.storageKey, JSON.stringify(logs));
    }

    removeLog(id) {
        let logs = this.getLogs();
        logs = logs.filter(log => log.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(logs));
    }

    getTotals() {
        const logs = this.getLogs();
        return logs.reduce((acc, item) => {
            acc.calories += item.calories;
            acc.protein += item.protein;
            acc.carbs += item.carbs;
            acc.fats += item.fats;
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
    }
}

// --- 3. UI & Router Controller Class ---
class AppRouter {
    constructor() {
        this.api = new APIClient();
        this.logManager = new FoodLogManager();
        
        window.addEventListener('popstate', (e) => {
            const route = e.state?.route || 'home';
            this.renderRoute(route, false);
        });
    }

    init() {
        const path = window.location.hash.replace('#', '') || 'home';
        this.navigateTo(path, false);
    }

    navigateTo(route, push = true) {
        if (push) {
            history.pushState({ route }, '', `#${route}`);
        }
        this.updateNavUI(route);
        this.renderRoute(route);
    }

    updateNavUI(route) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('text-emerald-600', 'bg-emerald-50');
            btn.classList.add('text-gray-600', 'hover:bg-gray-100');
        });
        const activeBtn = document.getElementById(`nav-${route}`);
        if (activeBtn) {
            activeBtn.classList.remove('text-gray-600', 'hover:bg-gray-100');
            activeBtn.classList.add('text-emerald-600', 'bg-emerald-50');
        }
    }

    async renderRoute(route) {
        const container = document.getElementById('app-view');
        
        if (route === 'home') {
            await this.renderHomePage(container);
        } else if (route === 'foodlog') {
            this.renderFoodLogPage(container);
        } else if (route === 'scanner') {
            this.renderScannerPage(container);
        } else if (route.startsWith('meal/')) {
            const mealId = route.split('/')[1];
            await this.renderMealDetailsPage(container, mealId);
        }
    }

    // --- Home Page (Matches the Design) ---
    async renderHomePage(container) {
        container.innerHTML = `<div class="text-center py-16"><i class="fa-solid fa-spinner fa-spin text-3xl text-emerald-600"></i><p class="mt-2 text-gray-500">Loading meals & categories...</p></div>`;
        
        const [meals, categories, areas] = await Promise.all([
            this.api.getMeals(),
            this.api.getCategories(),
            this.api.getAreas()
        ]);

        container.innerHTML = `
            <div class="mb-8">
                <h2 class="text-3xl font-extrabold text-gray-900">Meals & Recipes</h2>
                <p class="text-gray-500 text-sm mt-1">Discover delicious and nutritious recipes tailored for you</p>
            </div>

            <!-- Search Bar -->
            <div class="relative mb-6">
                <i class="fa-solid fa-magnifying-glass absolute left-4 top-3.5 text-gray-400"></i>
                <input type="text" id="search-input" placeholder="Search recipes by name, ingredient, or cuisine..." class="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm">
            </div>

            <!-- Cuisines Filter Bar -->
            <div class="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
                <button onclick="filterByArea('All')" class="px-4 py-2 bg-emerald-600 text-white rounded-full text-sm font-medium whitespace-nowrap shadow-sm">All Cuisines</button>
                ${areas.slice(0, 15).map(area => `
                    <button onclick="filterByArea('${area.strArea}')" class="px-4 py-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-full text-sm font-medium whitespace-nowrap shadow-sm">${area.strArea}</button>
                `).join('')}
            </div>

            <!-- Browse by Meal Type (Categories) -->
            <div class="mb-10">
                <h3 class="font-bold text-lg text-gray-900 mb-1">Browse by Meal Type</h3>
                <p class="text-xs text-gray-400 mb-4">Find the perfect recipe for any time of day</p>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    ${categories.slice(0, 6).map(cat => `
                        <div onclick="filterByCategory('${cat.strCategory}')" class="bg-white border p-4 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer text-center">
                            <img src="${cat.strCategoryThumb}" alt="${cat.strCategory}" class="w-12 h-12 mx-auto object-contain mb-2">
                            <h4 class="font-semibold text-xs text-gray-800">${cat.strCategory}</h4>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- All Recipes Grid -->
            <div>
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-lg text-gray-900">All Recipes</h3>
                    <span class="text-xs text-gray-500 font-medium">Showing ${meals.length} recipes</span>
                </div>
                <div id="meals-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    ${this.generateMealsHTML(meals)}
                </div>
            </div>
        `;

        // Live Search Handler
        document.getElementById('search-input').addEventListener('input', async (e) => {
            const query = e.target.value;
            const filteredMeals = await this.api.getMeals(query);
            document.getElementById('meals-grid').innerHTML = this.generateMealsHTML(filteredMeals);
        });
    }

    generateMealsHTML(meals) {
        if (meals.length === 0) return `<p class="col-span-full text-center text-gray-400 py-8">No recipes found.</p>`;
        return meals.map(meal => `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition cursor-pointer flex flex-col" onclick="router.navigateTo('meal/${meal.idMeal}')">
                <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="w-full h-48 object-cover">
                <div class="p-4 flex flex-col flex-grow justify-between">
                    <div>
                        <span class="text-[10px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full">${meal.strCategory || 'Recipe'}</span>
                        <h4 class="font-bold text-base mt-2 text-gray-800 line-clamp-1">${meal.strMeal}</h4>
                    </div>
                    <p class="text-xs text-gray-400 mt-3 flex items-center gap-1"><i class="fa-solid fa-globe"></i> ${meal.strArea || 'International'}</p>
                </div>
            </div>
        `).join('');
    }

    // --- Meal Details Page ---
    async renderMealDetailsPage(container, mealId) {
        container.innerHTML = `<div class="text-center py-16"><i class="fa-solid fa-spinner fa-spin text-3xl text-emerald-600"></i></div>`;
        const meal = await this.api.getMealDetails(mealId);

        if (!meal) {
            container.innerHTML = `<p class="text-center text-red-500">Meal not found.</p>`;
            return;
        }

        container.innerHTML = `
            <button onclick="router.navigateTo('home')" class="mb-6 text-emerald-600 font-semibold text-sm hover:underline flex items-center gap-2"><i class="fa-solid fa-arrow-left"></i> Back to Recipes</button>
            <div class="bg-white rounded-3xl shadow-sm border p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                    <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="w-full h-96 object-cover rounded-2xl shadow-md">
                    <div class="mt-6">
                        <button onclick="logThisMeal('${meal.strMeal}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2">
                            <i class="fa-solid fa-circle-plus"></i> Log This Meal
                        </button>
                    </div>
                </div>
                <div>
                    <span class="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full">${meal.strCategory}</span>
                    <h2 class="text-3xl font-extrabold text-gray-900 mt-2">${meal.strMeal}</h2>
                    <p class="text-gray-400 text-sm mt-1">Cuisine Region: <span class="text-gray-700 font-semibold">${meal.strArea}</span></p>
                    
                    <div class="mt-6">
                        <h4 class="font-bold text-gray-800 mb-3">Nutrition Facts (Estimated)</h4>
                        <div class="grid grid-cols-4 gap-3 text-center bg-gray-50 p-4 rounded-2xl border">
                            <div><span class="block text-[11px] text-gray-400">Calories</span><span class="font-bold text-emerald-600 text-base">480</span></div>
                            <div><span class="block text-[11px] text-gray-400">Protein</span><span class="font-bold text-gray-800 text-base">32g</span></div>
                            <div><span class="block text-[11px] text-gray-400">Carbs</span><span class="font-bold text-gray-800 text-base">45g</span></div>
                            <div><span class="block text-[11px] text-gray-400">Fats</span><span class="font-bold text-gray-800 text-base">14g</span></div>
                        </div>
                    </div>

                    <div class="mt-6">
                        <h4 class="font-bold text-gray-800 mb-2">Instructions</h4>
                        <p class="text-gray-600 text-sm leading-relaxed">${meal.strInstructions}</p>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Food Log Page ---
    renderFoodLogPage(container) {
        const logs = this.logManager.getLogs();
        const totals = this.logManager.getTotals();
        const goals = this.logManager.goals;

        container.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <div class="mb-8">
                    <h2 class="text-3xl font-extrabold text-gray-900">Food Log & Daily Tracker</h2>
                    <p class="text-gray-400 text-sm mt-1">Track your daily calories and macros effortlessly</p>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div class="bg-white p-5 rounded-2xl border shadow-sm">
                        <span class="text-xs text-gray-400">Calories</span>
                        <h3 class="text-2xl font-black text-emerald-600 mt-1">${totals.calories} <span class="text-xs text-gray-400 font-normal">/ ${goals.calories}</span></h3>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border shadow-sm">
                        <span class="text-xs text-gray-400">Protein</span>
                        <h3 class="text-2xl font-black text-blue-600 mt-1">${totals.protein}g <span class="text-xs text-gray-400 font-normal">/ ${goals.protein}g</span></h3>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border shadow-sm">
                        <span class="text-xs text-gray-400">Carbs</span>
                        <h3 class="text-2xl font-black text-amber-600 mt-1">${totals.carbs}g <span class="text-xs text-gray-400 font-normal">/ ${goals.carbs}g</span></h3>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border shadow-sm">
                        <span class="text-xs text-gray-400">Fats</span>
                        <h3 class="text-2xl font-black text-purple-600 mt-1">${totals.fats}g <span class="text-xs text-gray-400 font-normal">/ ${goals.fats}g</span></h3>
                    </div>
                </div>

                <div class="bg-white rounded-2xl border shadow-sm p-6">
                    <h3 class="font-bold text-lg text-gray-900 mb-4">Today's Logged Items</h3>
                    ${logs.length === 0 ? `<p class="text-gray-400 text-center py-12">No items logged yet. Explore recipes or use the product scanner!</p>` : `
                        <div class="divide-y">
                            ${logs.map(item => `
                                <div class="py-4 flex justify-between items-center">
                                    <div>
                                        <h4 class="font-bold text-gray-800">${item.name}</h4>
                                        <p class="text-xs text-gray-400 mt-0.5">${item.calories} kcal | Protein: ${item.protein}g | Carbs: ${item.carbs}g | Fats: ${item.fats}g</p>
                                    </div>
                                    <button onclick="removeLogItem(${item.id})" class="text-red-400 hover:text-red-600 p-2"><i class="fa-solid fa-trash-can"></i></button>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    // --- Product Scanner Page ---
    renderScannerPage(container) {
        container.innerHTML = `
            <div class="max-w-xl mx-auto bg-white p-8 rounded-3xl border shadow-sm">
                <h2 class="text-2xl font-extrabold text-gray-900 mb-1">Product Scanner</h2>
                <p class="text-sm text-gray-400 mb-6">Search packaged items like Pepsi, Nutella, snacks, etc.</p>
                
                <div class="flex gap-2 mb-6">
                    <input type="text" id="product-name" placeholder="Enter product name or barcode..." class="flex-grow px-4 py-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                    <button onclick="searchProduct()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-semibold text-sm transition">Search</button>
                </div>

                <div id="scanner-result"></div>
            </div>
        `;
    }
}

// Global UI Helpers & Filters
const router = new AppRouter();

async function filterByCategory(category) {
    const meals = await router.api.getMealsByCategory(category);
    document.getElementById('meals-grid').innerHTML = router.generateMealsHTML(meals);
}

async function filterByArea(area) {
    const meals = area === 'All' ? await router.api.getMeals() : await router.api.getMealsByArea(area);
    document.getElementById('meals-grid').innerHTML = router.generateMealsHTML(meals);
}

function logThisMeal(mealName) {
    router.logManager.addLog({ name: mealName, calories: 480, protein: 32, carbs: 45, fats: 14 });
    alert(`Successfully logged "${mealName}" to your Food Log!`);
    router.navigateTo('foodlog');
}

function removeLogItem(id) {
    router.logManager.removeLog(id);
    router.renderFoodLogPage(document.getElementById('app-view'));
}

function searchProduct() {
    const query = document.getElementById('product-name').value;
    if (!query) return;
    
    document.getElementById('scanner-result').innerHTML = `
        <div class="border p-4 rounded-2xl flex justify-between items-center bg-gray-50">
            <div>
                <h4 class="font-bold text-gray-800 text-sm">${query}</h4>
                <p class="text-xs text-gray-400 mt-0.5">250 kcal | P: 3g | C: 35g | F: 8g</p>
            </div>
            <button onclick="logScannedProduct('${query}')" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-700">Add to Log</button>
        </div>
    `;
}

function logScannedProduct(name) {
    router.logManager.addLog({ name: name, calories: 250, protein: 3, carbs: 35, fats: 8 });
    alert(`Successfully added "${name}" to your Food Log!`);
    router.navigateTo('foodlog');
}

window.addEventListener('DOMContentLoaded', () => {
    router.init();
});