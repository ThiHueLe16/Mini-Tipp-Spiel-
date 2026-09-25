package com.check24.minitippspiel.controller;

import com.check24.minitippspiel.dto.MatchCreateDto;
import com.check24.minitippspiel.dto.MatchScoreDto;
import com.check24.minitippspiel.model.Match;
import com.check24.minitippspiel.service.MatchService;
import com.check24.minitippspiel.service.ScoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;
    private final ScoringService scoringService;

    // --- PUBLIC / USER ENDPOINTS ---

    @GetMapping
    public ResponseEntity<List<Match>> getAllMatches() {
        return ResponseEntity.ok(matchService.getAllMatches());
    }

    @GetMapping("/{matchId}")
    public ResponseEntity<Match> getMatchById(@PathVariable Long matchId) {
        return matchService.getMatchById(matchId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // --- ADMIN ENDPOINTS ---

    @PostMapping("/admin")
    public ResponseEntity<Match> createMatch(@RequestBody MatchCreateDto dto) {
        return ResponseEntity.ok(matchService.createMatch(dto));
    }

    @PutMapping("/admin/{matchId}")
    public ResponseEntity<Match> updateMatch(@PathVariable Long matchId, @RequestBody MatchCreateDto dto) {
        return matchService.updateMatch(matchId, dto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/admin/{matchId}")
    public ResponseEntity<Map<String, Object>> deleteMatch(@PathVariable Long matchId) {
        boolean deleted = matchService.deleteMatch(matchId);
        if (deleted) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Match " + matchId + " deleted successfully."
            ));
        }
        return ResponseEntity.notFound().build();
    }



    // ADD THIS ENDPOINT FOR UPDATING SCORES/ EVENTS
    @PutMapping("/admin/{matchId}/score")
    public ResponseEntity<Match> updateMatchScore(
            @PathVariable Long matchId,
            @RequestBody MatchScoreDto scoreDto) {

        return matchService.updateMatchScore(matchId, scoreDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 2. UPDATE THIS ENDPOINT TO FETCH SAVED MATCH SCORES DIRECTLY
    @PostMapping("/admin/{matchId}/evaluate")
    public ResponseEntity<Map<String, Object>> evaluateMatch(@PathVariable Long matchId) {
        Match match = matchService.getMatchById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found: " + matchId));

        if (match.getFinalHomeGoals() == null || match.getFinalAwayGoals() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Match score has not been set yet."
            ));
        }

        scoringService.evaluateMatch(matchId, match.getFinalHomeGoals(), match.getFinalAwayGoals());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Match " + matchId + " successfully evaluated and user points updated."
        ));
    }


}