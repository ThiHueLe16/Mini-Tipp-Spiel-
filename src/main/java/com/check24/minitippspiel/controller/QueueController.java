package com.check24.minitippspiel.controller;

import com.check24.minitippspiel.service.QueueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/waiting-room")
@RequiredArgsConstructor
public class QueueController {

    private final QueueService queueService;

    @PostMapping("/admin/stock")
    public ResponseEntity<String> setStock(@RequestParam int amount) {
        queueService.setAvailableStock(amount);
        return ResponseEntity.ok("Stock initialized to " + amount + "\n");
    }

    @PostMapping("/join")
    public ResponseEntity<Map<String, Object>> joinQueue(@RequestParam String userId) {
        return ResponseEntity.ok(queueService.joinQueue(userId));
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus(@RequestParam String userId) {
        return ResponseEntity.ok(queueService.getQueueStatus(userId));
    }

    //Add an explicit leave endpoint for when a user clicks a "Leave Waiting Room" button/leave the waiting room
    @PostMapping("/leave")
    public ResponseEntity<String> leaveQueue(@RequestParam String userId) {
        queueService.leaveQueue(userId);
        return ResponseEntity.ok("User " + userId + " left the queue.");
    }
}