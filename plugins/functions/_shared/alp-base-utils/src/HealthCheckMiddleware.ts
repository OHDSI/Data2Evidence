export const healthCheckMiddleware = async (req, res, next) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: "OK",
        timestamp: Date.now(),
    };
    try {
        res.send(healthcheck);
    } catch (e) {
        healthcheck.message = e;
        console.error(e.message);
        res.send(503);
    }
};
