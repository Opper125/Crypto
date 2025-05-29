// Supabase Configuration
const SUPABASE_URL = https://uwuztdwbjwkuoqmclcpq.supabase.co
const SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dXp0ZHdiandrdW9xbWNsY3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDc3MzIsImV4cCI6MjA2MzUyMzczMn0.79WzYhDz-v80SbhOWEIegtSJKO6AtBcLN5REasUz1CI

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Global Variables
let currentUser = null
let marketData = {}
let userWallets = {}
let isKYCApproved = false

// DOM Elements
const loadingScreen = document.getElementById("loadingScreen")
const authModal = document.getElementById("authModal")
const kycModal = document.getElementById("kycModal")
const mainApp = document.getElementById("mainApp")

// Initialize Application
document.addEventListener("DOMContentLoaded", async () => {
  await initializeApp()
})

async function initializeApp() {
  try {
    // Check if user is already logged in
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      currentUser = session.user
      await loadUserData()

      if (isKYCApproved) {
        showMainApp()
      } else {
        showKYCModal()
      }
    } else {
      showAuthModal()
    }

    // Initialize event listeners
    initializeEventListeners()

    // Start real-time updates
    startRealTimeUpdates()
  } catch (error) {
    console.error("Initialization error:", error)
    showMessage("အက်ပ်လိကေးရှင်းစတင်ရာတွင် အမှားတစ်ခုဖြစ်ပွားခဲ့သည်", "error")
  } finally {
    hideLoadingScreen()
  }
}

function hideLoadingScreen() {
  setTimeout(() => {
    loadingScreen.style.display = "none"
  }, 2000)
}

function showAuthModal() {
  authModal.style.display = "block"
}

function hideAuthModal() {
  authModal.style.display = "none"
}

function showKYCModal() {
  kycModal.style.display = "block"
}

function hideKYCModal() {
  kycModal.style.display = "none"
}

function showMainApp() {
  hideAuthModal()
  hideKYCModal()
  mainApp.style.display = "block"
  loadMarketData()
  loadUserWallets()
  loadTransactionHistory()
}

// Event Listeners
function initializeEventListeners() {
  // Auth Modal Events
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const tab = this.dataset.tab
      switchAuthTab(tab)
    })
  })

  // Close Modal Events
  document.querySelectorAll(".close").forEach((closeBtn) => {
    closeBtn.addEventListener("click", function () {
      this.closest(".modal").style.display = "none"
    })
  })

  // Auth Form Events
  document.getElementById("loginFormSubmit").addEventListener("submit", handleLogin)
  document.getElementById("registerFormSubmit").addEventListener("submit", handleRegister)
  document.getElementById("kycForm").addEventListener("submit", handleKYCSubmission)

  // Navigation Events
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault()
      const section = this.dataset.section
      switchSection(section)
    })
  })

  // User Menu Events
  document.getElementById("userMenuBtn").addEventListener("click", toggleUserMenu)
  document.getElementById("logoutBtn").addEventListener("click", handleLogout)

  // Trading Events
  document.getElementById("buyPrice").addEventListener("input", calculateBuyTotal)
  document.getElementById("buyAmount").addEventListener("input", calculateBuyTotal)
  document.getElementById("sellPrice").addEventListener("input", calculateSellTotal)
  document.getElementById("sellAmount").addEventListener("input", calculateSellTotal)

  // Wallet Events
  document.getElementById("depositBtn").addEventListener("click", showDepositModal)
  document.getElementById("withdrawBtn").addEventListener("click", showWithdrawModal)

  // Window Events
  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      e.target.style.display = "none"
    }
  })

  // Transfer Form Events
  const transferForm = document.getElementById("transferForm")
  if (transferForm) {
    transferForm.addEventListener("submit", handleTransfer)
  }
}

function switchAuthTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"))
  document.querySelectorAll(".auth-form").forEach((form) => form.classList.remove("active"))

  document.querySelector(`[data-tab="${tab}"]`).classList.add("active")
  document.getElementById(`${tab}Form`).classList.add("active")
}

function switchSection(section) {
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"))
  document.querySelectorAll(".section").forEach((sec) => sec.classList.remove("active"))

  document.querySelector(`[data-section="${section}"]`).classList.add("active")
  document.getElementById(`${section}Section`).classList.add("active")
}

function toggleUserMenu() {
  const dropdown = document.getElementById("userDropdown")
  dropdown.classList.toggle("show")
}

// Authentication Functions
async function handleLogin(e) {
  e.preventDefault()

  const email = document.getElementById("loginEmail").value
  const password = document.getElementById("loginPassword").value

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) throw error

    currentUser = data.user
    await loadUserData()

    if (isKYCApproved) {
      showMainApp()
      showMessage("အောင်မြင်စွာ ဝင်ရောက်ခဲ့သည်", "success")
    } else {
      showKYCModal()
    }
  } catch (error) {
    console.error("Login error:", error)
    showMessage("အကောင့်ဝင်ရောက်ရာတွင် အမှားတစ်ခုဖြစ်ပွားခဲ့သည်", "error")
  }
}

async function handleRegister(e) {
  e.preventDefault()

  const name = document.getElementById("registerName").value
  const email = document.getElementById("registerEmail").value
  const phone = document.getElementById("registerPhone").value
  const country = document.getElementById("registerCountry").value
  const password = document.getElementById("registerPassword").value
  const confirmPassword = document.getElementById("confirmPassword").value

  if (password !== confirmPassword) {
    showMessage("လျှို့ဝှက်နံပါတ်များ မတူညီပါ", "error")
    return
  }

  try {
    // Check if email already exists
    const { data: existingUser } = await supabase.from("users").select("email").eq("email", email).single()

    if (existingUser) {
      showMessage("ဤ Gmail လိပ်စာဖြင့် အကောင့်တစ်ခု ရှိပြီးဖြစ်သည်", "error")
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: name,
          phone: phone,
          country: country,
        },
      },
    })

    if (error) throw error

    // Insert user data into custom users table
    const { error: insertError } = await supabase.from("users").insert([
      {
        id: data.user.id,
        email: email,
        full_name: name,
        phone: phone,
        country: country,
        kyc_status: "pending",
      },
    ])

    if (insertError) throw insertError

    // Create default wallets
    await createDefaultWallets(data.user.id)

    currentUser = data.user
    showKYCModal()
    showMessage("အကောင့်အောင်မြင်စွာ ဖွင့်လှစ်ခဲ့သည်", "success")
  } catch (error) {
    console.error("Registration error:", error)
    showMessage("အကောင့်ဖွင့်ရာတွင် အမှားတစ်ခုဖြစ်ပွားခဲ့သည်", "error")
  }
}

async function createDefaultWallets(userId) {
  const currencies = ["BTC", "ETH", "BNB", "ADA", "SOL"]

  for (const currency of currencies) {
    const address = generateWalletAddress(currency)

    await supabase.from("wallets").insert([
      {
        user_id: userId,
        currency: currency,
        balance: 0,
        address: address,
      },
    ])
  }
}

function generateWalletAddress(currency) {
  const prefixes = {
    BTC: "1",
    ETH: "0x",
    BNB: "bnb",
    ADA: "addr",
    SOL: "sol",
  }

  const prefix = prefixes[currency] || ""
  const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  return prefix + randomString
}

async function handleKYCSubmission(e) {
  e.preventDefault()

  const fileInput = document.getElementById("kycDocument")
  const file = fileInput.files[0]

  if (!file) {
    showMessage("KYC စာရွက်စာတမ်း ရွေးချယ်ပါ", "error")
    return
  }

  try {
    // Upload file to Supabase Storage
    const fileName = `kyc_${currentUser.id}_${Date.now()}.${file.name.split(".").pop()}`
    const { data: uploadData, error: uploadError } = await supabase.storage.from("kyc-documents").upload(fileName, file)

    if (uploadError) throw uploadError

    // Update user KYC status
    const { error: updateError } = await supabase
      .from("users")
      .update({
        kyc_document_url: uploadData.path,
        kyc_status: "pending",
      })
      .eq("id", currentUser.id)

    if (updateError) throw updateError

    showMessage("KYC စာရွက်စာတမ်း အောင်မြင်စွာ တင်သွင်းခဲ့သည်။ အတည်ပြုခြင်းကို စောင့်ဆိုင်းပါ။", "success")
    hideKYCModal()

    // For demo purposes, auto-approve KYC after 3 seconds
    setTimeout(async () => {
      await supabase.from("users").update({ kyc_status: "approved" }).eq("id", currentUser.id)

      isKYCApproved = true
      showMainApp()
      showMessage("KYC အတည်ပြုခြင်း အောင်မြင်ပါသည်", "success")
    }, 3000)
  } catch (error) {
    console.error("KYC submission error:", error)
    showMessage("KYC တင်သွင်းရာတွင် အမှားတစ်ခုဖြစ်ပွားခဲ့သည်", "error")
  }
}

async function loadUserData() {
  try {
    const { data: userData, error } = await supabase.from("users").select("*").eq("id", currentUser.id).single()

    if (error) throw error

    isKYCApproved = userData.kyc_status === "approved"
    document.getElementById("userName").textContent = userData.full_name
  } catch (error) {
    console.error("Error loading user data:", error)
  }
}

async function handleLogout() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error

    currentUser = null
    isKYCApproved = false
    mainApp.style.display = "none"
    showAuthModal()
    showMessage("အောင်မြင်စွာ ထွက်ခဲ့သည်", "success")
  } catch (error) {
    console.error("Logout error:", error)
    showMessage("ထွက်ရာတွင် အမှားတစ်ခုဖြစ်ပွားခဲ့သည်", "error")
  }
}

// Market Data Functions
async function loadMarketData() {
  try {
    const { data, error } = await supabase.from("market_data").select("*").order("symbol")

    if (error) throw error

    marketData = {}
    data.forEach((coin) => {
      marketData[coin.symbol] = coin
    })

    displayMarketData()
    updateTotalBalance()
  } catch (error) {
    console.error("Error loading market data:", error)
  }
}

function displayMarketData() {
  const marketGrid = document.getElementById("marketGrid")
  marketGrid.innerHTML = ""

  Object.values(marketData).forEach((coin) => {
    const changeClass = coin.price_change_24h >= 0 ? "positive" : "negative"
    const changeSymbol = coin.price_change_24h >= 0 ? "+" : ""

    const marketCard = document.createElement("div")
    marketCard.className = "market-card fade-in"
    marketCard.innerHTML = `
            <h4>${coin.symbol}</h4>
            <div class="market-price">$${formatNumber(coin.price_usd)}</div>
            <div class="market-change ${changeClass}">
                ${changeSymbol}${coin.price_change_24h}%
            </div>
            <div class="market-volume">
                Volume: $${formatNumber(coin.volume_24h)}
            </div>
        `

    marketGrid.appendChild(marketCard)
  })
}

// Wallet Functions
async function loadUserWallets() {
  try {
    const { data, error } = await supabase.from("wallets").select("*").eq("user_id", currentUser.id)

    if (error) throw error

    userWallets = {}
    data.forEach((wallet) => {
      userWallets[wallet.currency] = wallet
    })

    displayWalletBalances()
    updateTotalBalance()
  } catch (error) {
    console.error("Error loading wallets:", error)
  }
}

function displayWalletBalances() {
  const walletBalances = document.getElementById("walletBalances")
  walletBalances.innerHTML = ""

  Object.values(userWallets).forEach((wallet) => {
    const marketPrice = marketData[wallet.currency]?.price_usd || 0
    const usdValue = wallet.balance * marketPrice

    const walletCard = document.createElement("div")
    walletCard.className = "wallet-card fade-in"
    walletCard.innerHTML = `
            <div class="wallet-icon">
                <i class="fab fa-bitcoin"></i>
            </div>
            <div class="wallet-currency">${wallet.currency}</div>
            <div class="wallet-balance">${formatNumber(wallet.balance)}</div>
            <div class="wallet-usd">≈ $${formatNumber(usdValue)}</div>
            <div class="wallet-address">${wallet.address}</div>
            <div class="wallet-actions">
                <button class="transfer-btn" onclick="showTransferModal('${wallet.currency}')">
                    ငွေလွှဲရန်
                </button>
            </div>
        `

    walletBalances.appendChild(walletCard)
  })
}

function updateTotalBalance() {
  let totalUSD = 0

  Object.values(userWallets).forEach((wallet) => {
    const marketPrice = marketData[wallet.currency]?.price_usd || 0
    totalUSD += wallet.balance * marketPrice
  })

  document.getElementById("totalBalance").textContent = formatNumber(totalUSD)
}

// Trading Functions
function calculateBuyTotal() {
  const price = Number.parseFloat(document.getElementById("buyPrice").value) || 0
  const amount = Number.parseFloat(document.getElementById("buyAmount").value) || 0
  const total = price * amount

  document.getElementById("buyTotal").value = total.toFixed(2)
}

function calculateSellTotal() {
  const price = Number.parseFloat(document.getElementById("sellPrice").value) || 0
  const amount = Number.parseFloat(document.getElementById("sellAmount").value) || 0
  const total = price * amount

  document.getElementById("sellTotal").value = total.toFixed(2)
}

// Transfer Functions
function showTransferModal(currency) {
  const transferModal = document.getElementById("transferModal")
  const transferCurrency = document.getElementById("transferCurrency")

  transferCurrency.value = currency
  transferModal.style.display = "block"

  updateTransferFee(currency)
}

function updateTransferFee(currency) {
  const fees = {
    BTC: 0.001,
    ETH: 0.01,
    BNB: 0.1,
    ADA: 1,
    SOL: 0.01,
  }

  const fee = fees[currency] || 0.001
  document.getElementById("transferFee").textContent = `${fee} ${currency}`
}

// Transaction History Functions
async function loadTransactionHistory() {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .or(`from_user_id.eq.${currentUser.id},to_user_id.eq.${currentUser.id}`)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) throw error

    displayTransactionHistory(data)
  } catch (error) {
    console.error("Error loading transaction history:", error)
  }
}

function displayTransactionHistory(transactions) {
  const historyList = document.getElementById("historyList")
  historyList.innerHTML = ""

  if (transactions.length === 0) {
    historyList.innerHTML = '<div class="no-transactions">မှတ်တမ်းမရှိပါ</div>'
    return
  }

  transactions.forEach((tx) => {
    const isIncoming = tx.to_user_id === currentUser.id
    const amountClass = isIncoming ? "positive" : "negative"
    const amountSymbol = isIncoming ? "+" : "-"

    const historyItem = document.createElement("div")
    historyItem.className = "history-item fade-in"
    historyItem.innerHTML = `
            <div class="history-icon ${tx.transaction_type}">
                <i class="fas fa-${getTransactionIcon(tx.transaction_type)}"></i>
            </div>
            <div class="history-details">
                <h4>${getTransactionTitle(tx.transaction_type)}</h4>
                <p>${formatDate(tx.created_at)}</p>
                <p>${tx.currency} - ${tx.transaction_hash || "N/A"}</p>
            </div>
            <div class="history-amount ${amountClass}">
                ${amountSymbol}${formatNumber(tx.amount)} ${tx.currency}
            </div>
            <div class="history-status ${tx.status}">
                ${getStatusText(tx.status)}
            </div>
        `

    historyList.appendChild(historyItem)
  })
}

function getTransactionIcon(type) {
  const icons = {
    deposit: "arrow-down",
    withdrawal: "arrow-up",
    transfer: "exchange-alt",
    trade: "chart-line",
  }
  return icons[type] || "question"
}

function getTransactionTitle(type) {
  const titles = {
    deposit: "ငွေသွင်း",
    withdrawal: "ငွေထုတ်",
    transfer: "ငွေလွှဲ",
    trade: "ကုန်သွယ်မှု",
  }
  return titles[type] || type
}

function getStatusText(status) {
  const statusTexts = {
    pending: "စောင့်ဆိုင်းနေသည်",
    completed: "ပြီးမြောက်သည်",
    failed: "မအောင်မြင်",
    cancelled: "ပယ်ဖျက်သည်",
  }
  return statusTexts[status] || status
}

// P2P Functions
async function loadP2POrders() {
  try {
    const { data, error } = await supabase
      .from("p2p_orders")
      .select(`
                *,
                users!p2p_orders_user_id_fkey(full_name)
            `)
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) throw error

    displayP2POrders(data)
  } catch (error) {
    console.error("Error loading P2P orders:", error)
  }
}

function displayP2POrders(orders) {
  const p2pOrders = document.getElementById("p2pOrders")
  p2pOrders.innerHTML = ""

  if (orders.length === 0) {
    p2pOrders.innerHTML = '<div class="no-orders">P2P အော်ဒါမရှိပါ</div>'
    return
  }

  orders.forEach((order) => {
    const orderElement = document.createElement("div")
    orderElement.className = "p2p-order fade-in"
    orderElement.innerHTML = `
            <div class="order-info">
                <h4>${order.users.full_name}</h4>
                <p>${order.crypto_currency}/${order.fiat_currency}</p>
            </div>
            <div class="order-amount">
                <strong>${formatNumber(order.amount)} ${order.crypto_currency}</strong>
                <p>Min: ${formatNumber(order.min_amount || 0)}</p>
            </div>
            <div class="order-price">
                ${formatNumber(order.price)} ${order.fiat_currency}
            </div>
            <button class="order-btn ${order.order_type}" onclick="initiateP2PTrade('${order.id}')">
                ${order.order_type === "buy" ? "ရောင်းရန်" : "ဝယ်ရန်"}
            </button>
        `

    p2pOrders.appendChild(orderElement)
  })
}

async function initiateP2PTrade(orderId) {
  try {
    // Get order details
    const { data: order, error: orderError } = await supabase.from("p2p_orders").select("*").eq("id", orderId).single()

    if (orderError) throw orderError

    if (order.user_id === currentUser.id) {
      showMessage("သင့်ကိုယ်ပိုင် အော်ဒါကို ကုန်သွယ်လို့မရပါ", "error")
      return
    }

    // Create P2P trade
    const { data: trade, error: tradeError } = await supabase
      .from("p2p_trades")
      .insert([
        {
          order_id: orderId,
          buyer_id: order.order_type === "sell" ? currentUser.id : order.user_id,
          seller_id: order.order_type === "buy" ? currentUser.id : order.user_id,
          amount: order.amount,
          price: order.price,
          total_amount: order.amount * order.price,
          status: "pending",
        },
      ])
      .select()
      .single()

    if (tradeError) throw tradeError

    showMessage("P2P ကုန်သွယ်မှု စတင်ခဲ့သည်", "success")
    loadP2POrders()
  } catch (error) {
    console.error("Error initiating P2P trade:", error)
    showMessage("P2P ကုန်သွယ်မှု စတင်ရာတွင် အမှားတစ်ခုဖြစ်ပွားခဲ့သည်", "error")
  }
}

// Real-time Updates
function startRealTimeUpdates() {
  // Market data updates every 30 seconds
  setInterval(updateMarketPrices, 30000)

  // Real-time subscriptions
  supabase
    .channel("market_data_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "market_data" }, (payload) => {
      console.log("Market data updated:", payload)
      loadMarketData()
    })
    .subscribe()

  supabase
    .channel("wallet_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${currentUser?.id}` },
      (payload) => {
        console.log("Wallet updated:", payload)
        loadUserWallets()
      },
    )
    .subscribe()

  supabase
    .channel("transaction_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, (payload) => {
      console.log("Transaction updated:", payload)
      loadTransactionHistory()
    })
    .subscribe()
}

async function updateMarketPrices() {
  try {
    // Simulate market price updates
    const updates = Object.keys(marketData).map((symbol) => {
      const currentPrice = marketData[symbol].price_usd
      const change = (Math.random() - 0.5) * 0.1 // ±5% max change
      const newPrice = currentPrice * (1 + change)
      const priceChange24h = (Math.random() - 0.5) * 10 // ±5% change

      return {
        symbol: symbol,
        price_usd: newPrice,
        price_change_24h: priceChange24h,
        last_updated: new Date().toISOString(),
      }
    })

    // Update market data in database
    for (const update of updates) {
      await supabase.from("market_data").update(update).eq("symbol", update.symbol)
    }
  } catch (error) {
    console.error("Error updating market prices:", error)
  }
}

// Utility Functions
function formatNumber(num) {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(2) + "B"
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + "M"
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + "K"
  } else {
    return Number.parseFloat(num)
      .toFixed(8)
      .replace(/\.?0+$/, "")
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("my-MM", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function showMessage(message, type = "info") {
  const messageElement = document.createElement("div")
  messageElement.className = `message ${type}`
  messageElement.textContent = message

  document.body.appendChild(messageElement)

  setTimeout(() => {
    messageElement.remove()
  }, 5000)
}

// Deposit/Withdraw Functions
function showDepositModal() {
  showMessage("ငွေသွင်းခြင်း လုပ်ဆောင်ချက်ကို မကြာမီ ထည့်သွင်းပါမည်", "warning")
}

function showWithdrawModal() {
  showMessage("ငွေထုတ်ခြင်း လုပ်ဆောင်ချက်ကို မကြာမီ ထည့်သွင်းပါမည်", "warning")
}

// Transfer Form Handler
async function handleTransfer(e) {
  e.preventDefault()

  const address = document.getElementById("transferAddress").value
  const currency = document.getElementById("transferCurrency").value
  const amount = Number.parseFloat(document.getElementById("transferAmount").value)

  if (!address || !currency || !amount || amount <= 0) {
    showMessage("ကျေးဇူးပြု၍ လိုအပ်သော အချက်လက်များကို ဖြည့်သွင်းပါ", "error")
    return
  }

  try {
    // Check if user has sufficient balance
    const userWallet = userWallets[currency]
    if (!userWallet || userWallet.balance < amount) {
      showMessage("လက်ကျန်ငွေ မလုံလောက်ပါ", "error")
      return
    }

    // Check if address belongs to the same user (prevent self-transfer)
    const { data: targetWallet } = await supabase
      .from("wallets")
      .select("user_id")
      .eq("address", address)
      .eq("currency", currency)
      .single()

    if (targetWallet && targetWallet.user_id === currentUser.id) {
      showMessage("သင့်ကိုယ်ပိုင် လိပ်စာသို့ ငွေလွှဲလို့မရပါ", "error")
      return
    }

    // Create transaction
    const { error: txError } = await supabase.from("transactions").insert([
      {
        from_user_id: currentUser.id,
        from_address: userWallet.address,
        to_address: address,
        currency: currency,
        amount: amount,
        fee: 0.001,
        transaction_type: "transfer",
        status: "pending",
        transaction_hash: generateTransactionHash(),
      },
    ])

    if (txError) throw txError

    // Update sender balance
    await supabase
      .from("wallets")
      .update({ balance: userWallet.balance - amount })
      .eq("user_id", currentUser.id)
      .eq("currency", currency)

    // Update receiver balance if address exists in our system
    if (targetWallet) {
      const { data: receiverWallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("address", address)
        .eq("currency", currency)
        .single()

      if (receiverWallet) {
        await supabase
          .from("wallets")
          .update({ balance: receiverWallet.balance + amount })
          .eq("address", address)
          .eq("currency", currency)
      }
    }

    document.getElementById("transferModal").style.display = "none"
    showMessage("ငွေလွှဲမှု အောင်မြင်ခဲ့သည်", "success")

    // Reload data
    loadUserWallets()
    loadTransactionHistory()
  } catch (error) {
    console.error("Transfer error:", error)
    showMessage("ငွေလွှဲရာတွင် အမှားတစ်ခုဖြစ်ပွားခဲ့သည်", "error")
  }
}

function generateTransactionHash() {
  return "tx_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Initialize P2P when section is loaded
const p2pNavItem = document.querySelector('[data-section="p2p"]')
if (p2pNavItem) {
  p2pNavItem.addEventListener("click", () => {
    setTimeout(loadP2POrders, 100)
  })
}
