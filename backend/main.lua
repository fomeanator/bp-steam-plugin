-- BattlePass Steam Plugin - Lua Backend

local http = require("http")
local json = require("json")
local millennium = require("millennium")
local logger = require("logger")

local API_BASE = "https://profile.battlepass.ru"
local ORG = "extension"
local token = nil

-- Make HTTP request
local function make_request(endpoint, method, body)
    local url = API_BASE .. endpoint
    local headers = {
        ["Content-Type"] = "application/json",
        ["User-Agent"] = "BattlePass-Steam/1.0"
    }

    if token then
        headers["Authorization"] = "Bearer " .. token
    end

    local response, err

    if method == "POST" then
        response, err = http.post(url, {
            headers = headers,
            body = json.encode(body),
            timeout = 30
        })
    else
        response, err = http.get(url, {
            headers = headers,
            timeout = 30
        })
    end

    if err then
        logger.error("[BP] HTTP Error: " .. tostring(err))
        return json.encode({error = tostring(err)})
    end

    return response.body
end

-- API Functions

function auth_steam(steam_id64, username)
    logger.log("[BP] auth_steam: " .. tostring(steam_id64))
    local result = make_request("/api/v2/user/auth/steam", "POST", {
        steamId64 = steam_id64 or "76561198000000000",
        username = username or ""
    })

    local data = json.decode(result)
    if data and data.access_token then
        token = data.access_token
        logger.log("[BP] Auth OK")
    end

    return result
end

function get_payment_methods()
    logger.log("[BP] get_payment_methods")
    return make_request("/api/v2/payment/bills/steam?org=" .. ORG, "GET", nil)
end

function calculate_commission(amount, method_name, currency, account, promocode)
    return make_request("/api/v2/payment/comission?org=" .. ORG, "POST", {
        amount = tonumber(amount) or 0,
        account = account or "",
        currency = string.lower(currency or "rub"),
        type = 0,
        isIncludeCommission = false,
        billType = 0,
        tag = method_name or "",
        promocode = promocode or ""
    })
end

function validate_promocode(code, account)
    return make_request("/api/v2/payment/validate?org=" .. ORG, "POST", {
        code = string.upper(code or ""),
        account = account or "test"
    })
end

function convert_currency(amount, from_currency, to_currency, account)
    return make_request("/api/v2/payment/convert?org=" .. ORG, "POST", {
        amount = tonumber(amount) or 0,
        account = account or "test",
        type = 1,
        isIncludeCommission = true,
        billType = 1,
        inputCurrency = string.lower(from_currency or "kzt"),
        outputCurrency = string.lower(to_currency or "rub")
    })
end

function create_order(amount, method_name, currency, account, promocode)
    local input_values = {
        {name = "account", value = account or ""},
        {name = "amount", value = tostring(amount)},
        {name = "currency", value = string.lower(currency or "rub")}
    }

    if promocode and promocode ~= "" then
        table.insert(input_values, {name = "promocode", value = string.upper(promocode)})
    end

    return make_request("/api/v2/payment/create?org=" .. ORG, "POST", {
        productId = "1",
        tag = method_name,
        service = "steam",
        productType = "DIRECT_PAYMENT",
        region = {name = "Россия", value = "RU"},
        inputValues = input_values
    })
end

-- Plugin lifecycle
logger.log("[BP] Lua backend loaded")
millennium.ready()
