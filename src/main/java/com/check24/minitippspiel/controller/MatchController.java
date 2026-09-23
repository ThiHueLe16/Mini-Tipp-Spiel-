package com.check24.minitippspiel.controller;

import com.check24.minitippspiel.dto.MatchCreateDto;
import com.check24.minitippspiel.model.Match;
import com.check24.minitippspiel.repository.MatchRepository;
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

    private final MatchRepository matchRepository;
    private final ScoringService scoringService;

    // --- PUBLIC / USER ENDPOINTS ---

    @GetMapping
    public ResponseEntity<List<Match>> getAllMatches() {
        return ResponseEntity.ok(matchRepository.findAll());
    }

    @GetMapping("/{matchId}")
    public ResponseEntity<Match> getMatchById(@PathVariable Long matchId) {
        return matchRepository.findById(matchId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // --- ADMIN ENDPOINTS ---

    @PostMapping("/admin")
    public ResponseEntity<Match> createMatch(@RequestBody MatchCreateDto dto) {
        Match match = Match.builder()
                .homeTeam(dto.homeTeam())
                .awayTeam(dto.awayTeam())
                .kickoffTime(dto.kickoffTime())
                .build();
        return ResponseEntity.ok(matchRepository.save(match));
    }

    @PutMapping("/admin/{matchId}")
    public ResponseEntity<Match> updateMatch(@PathVariable Long matchId, @RequestBody MatchCreateDto dto) {
        return matchRepository.findById(matchId)
                .map(existingMatch -> {
                    existingMatch.setHomeTeam(dto.homeTeam());
                    existingMatch.setAwayTeam(dto.awayTeam());
                    existingMatch.setKickoffTime(dto.kickoffTime());
                    return ResponseEntity.ok(matchRepository.save(existingMatch));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/admin/{matchId}")
    public ResponseEntity<Map<String, Object>> deleteMatch(@PathVariable Long matchId) {
        return matchRepository.findById(matchId)
                .map(match -> {
                    matchRepository.delete(match);
                    return ResponseEntity.ok(Map.<String, Object>of(
                            "success", true,
                            "message", "Match " + matchId + " deleted successfully."
                    ));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/admin/{matchId}/evaluate")
    public ResponseEntity<Map<String, Object>> evaluateMatch(
            @PathVariable Long matchId,
            @RequestParam int finalHomeGoals,
            @RequestParam int finalAwayGoals) {

        scoringService.evaluateMatch(matchId, finalHomeGoals, finalAwayGoals);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Match " + matchId + " successfully evaluated and user points updated."
        ));
    }
}
