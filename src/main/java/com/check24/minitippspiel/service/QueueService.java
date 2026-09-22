package com.check24.minitippspiel.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class QueueService {

    private final StringRedisTemplate redisTemplate;

    private static final String QUEUE_KEY = "trikot:promotion:queue";
    private static final String STOCK_KEY = "trikot:promotion:stock";
    private static final String PASS_PREFIX = "pass:";
    private static final String HEARTBEAT_PREFIX = "heartbeat:";

    public void setAvailableStock(int totalStock) {
        redisTemplate.opsForValue().set(STOCK_KEY, String.valueOf(totalStock));
    }

    public Map<String, Object> joinQueue(String userId) {
        double score = System.currentTimeMillis() * 1000.0 + (System.nanoTime() % 1000);

        if (redisTemplate.opsForZSet().rank(QUEUE_KEY, userId) == null) {
            redisTemplate.opsForZSet().add(QUEUE_KEY, userId, score);
        }

        // Refresh active heartbeat on join
        touchHeartbeat(userId);

        return getQueueStatus(userId);
    }

    public Map<String, Object> getQueueStatus(String userId) {
        Map<String, Object> response = new HashMap<>();

        // 1. Refresh active heartbeat for the user requesting status
        touchHeartbeat(userId);

        // 2. Clean up users who abandoned the waiting room (no heartbeat for >10 seconds)
        cleanAbandonedUsers();

        // 3. Check if user already holds a pass token
        String existingPass = redisTemplate.opsForValue().get(PASS_PREFIX + userId);
        if (existingPass != null) {
            response.put("userId", userId);
            response.put("canAccessSubmissionPage", true);
            response.put("queuePassToken", existingPass);
            response.put("message", "Pass active. Proceed to submission.");
            return response;
        }

        Long rank = redisTemplate.opsForZSet().rank(QUEUE_KEY, userId);
        String stockStr = redisTemplate.opsForValue().get(STOCK_KEY);
        int currentStock = stockStr != null ? Integer.parseInt(stockStr) : 0;

        if (rank == null) {
            response.put("inQueue", false);
            response.put("message", "User is not in the waiting room.");
            return response;
        }

        long positionInLine = rank + 1;
        boolean eligibleForPass = positionInLine == 1 && currentStock > 0;

        if (eligibleForPass) {
            String passToken = "PASS-" + userId + "-" + System.currentTimeMillis();

            // Issue token (expires in 15 mins) and pop user out of queue ZSET
            redisTemplate.opsForValue().set(PASS_PREFIX + userId, passToken, Duration.ofMinutes(15));
            redisTemplate.opsForZSet().remove(QUEUE_KEY, userId);

            response.put("userId", userId);
            response.put("positionInLine", 0);
            response.put("remainingTrikots", currentStock);
            response.put("canAccessSubmissionPage", true);
            response.put("queuePassToken", passToken);
        } else {
            response.put("userId", userId);
            response.put("positionInLine", positionInLine);
            response.put("remainingTrikots", currentStock);
            response.put("canAccessSubmissionPage", false);
        }

        return response;
    }

    /**
     * Explicit exit endpoint if user clicks "Leave Queue"
     */
    public void leaveQueue(String userId) {
        redisTemplate.opsForZSet().remove(QUEUE_KEY, userId);
        redisTemplate.delete(HEARTBEAT_PREFIX + userId);
    }

    /**
     * Updates/refreshes the 10-second TTL heartbeat key for an active user
     */
    private void touchHeartbeat(String userId) {
        redisTemplate.opsForValue().set(HEARTBEAT_PREFIX + userId, "active", Duration.ofSeconds(10));
    }

    /**
     * Scans top users in queue; removes any user whose heartbeat expired
     */
    private void cleanAbandonedUsers() {
        // Fetch top 50 users from queue
        Set<String> topUsers = redisTemplate.opsForZSet().range(QUEUE_KEY, 0, 50);
        if (topUsers == null || topUsers.isEmpty()) return;

        for (String user : topUsers) {
            Boolean hasHeartbeat = redisTemplate.hasKey(HEARTBEAT_PREFIX + user);
            if (!hasHeartbeat) {
                // Heartbeat expired -> User closed browser tab! Remove from queue.
                redisTemplate.opsForZSet().remove(QUEUE_KEY, user);
            }
        }
    }

    public boolean validateAndClaimTrikot(String userId, String providedToken) {
        String storedToken = redisTemplate.opsForValue().get(PASS_PREFIX + userId);

        if (storedToken == null || !storedToken.equals(providedToken)) {
            return false;
        }

        Long remaining = redisTemplate.opsForValue().decrement(STOCK_KEY);

        if (remaining != null && remaining < 0) {
            redisTemplate.opsForValue().increment(STOCK_KEY);
            return false;
        }

        redisTemplate.delete(PASS_PREFIX + userId);
        redisTemplate.delete(HEARTBEAT_PREFIX + userId);
        return true;
    }
}