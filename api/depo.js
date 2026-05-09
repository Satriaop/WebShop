const apiKeyCashi = "CASHI-UMGIHO845T";
const dbUrl = "https://market-d978f-default-rtdb.asia-southeast1.firebasedatabase.app";

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { action, amount, orderId, userToken } = req.body;

    if (action === 'create') {
        const customOrderId = "DIKA-" + Date.now();
        try {
            const response = await fetch('https://cashi.id/api/create-order', {
                method: 'POST',
                headers: { 
                    'x-api-key': apiKeyCashi, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    amount: parseInt(amount) + 300,
                    order_id: customOrderId, 
                    QRIS_CUSTOM: true 
                })
            });
            const data = await response.json();

            if (data.success) {
                await fetch(`${dbUrl}/deposits/${customOrderId}.json`, {
                    method: 'PUT',
                    body: JSON.stringify({ 
                        userToken: userToken, 
                        amount: parseInt(amount), 
                        status: 'pending' 
                    })
                });
                return res.status(200).json(data);
            }
            return res.status(400).json(data);
        } catch (e) {
            return res.status(500).json({ error: "Server Error" });
        }
    }

    if (action === 'status') {
        try {
            const check = await fetch(`https://cashi.id/api/check-status/${orderId}`, {
                headers: { 'x-api-key': apiKeyCashi }
            });
            const resCashi = await check.json();

            if (resCashi.status === 'SETTLED') {
                const depRef = await fetch(`${dbUrl}/deposits/${orderId}.json`);
                const depData = await depRef.json();

                if (depData && depData.status === 'pending') {
                    const userRef = await fetch(`${dbUrl}/users/${depData.userToken}.json`);
                    const userData = await userRef.json();
                    
                    const currentBalance = userData.balance || 0;
                    const newBalance = currentBalance + depData.amount;

                    await fetch(`${dbUrl}/users/${depData.userToken}/balance.json`, { 
                        method: 'PUT', 
                        body: JSON.stringify(newBalance) 
                    });

                    await fetch(`${dbUrl}/deposits/${orderId}/status.json`, { 
                        method: 'PUT', 
                        body: JSON.stringify('success') 
                    });

                    return res.status(200).json({ status: 'SUCCESS' });
                }
            }
            return res.status(200).json(resCashi);
        } catch (e) {
            return res.status(500).json({ error: "Check Status Error" });
        }
    }
}
