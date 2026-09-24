package com.check24.minitippspiel.service;

import com.check24.minitippspiel.dto.MatchCreateDto;
import com.check24.minitippspiel.model.Match;
import com.check24.minitippspiel.repository.MatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matchRepository;

    @Transactional(readOnly = true)
    public List<Match> getAllMatches() {
        return matchRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Match> getMatchById(Long matchId) {
        return matchRepository.findById(matchId);
    }

    @Transactional
    public Match createMatch(MatchCreateDto dto) {
        Match match = Match.builder()
                .homeTeam(dto.homeTeam())
                .awayTeam(dto.awayTeam())
                .kickoffTime(dto.kickoffTime())
                .build();
        return matchRepository.save(match);
    }

    @Transactional
    public Optional<Match> updateMatch(Long matchId, MatchCreateDto dto) {
        return matchRepository.findById(matchId)
                .map(existingMatch -> {
                    existingMatch.setHomeTeam(dto.homeTeam());
                    existingMatch.setAwayTeam(dto.awayTeam());
                    existingMatch.setKickoffTime(dto.kickoffTime());
                    return matchRepository.save(existingMatch);
                });
    }

    @Transactional
    public boolean deleteMatch(Long matchId) {
        return matchRepository.findById(matchId)
                .map(match -> {
                    matchRepository.delete(match);
                    return true;
                })
                .orElse(false);
    }

    @Transactional
    public Optional<Match> updateMatchScore(Long matchId, Integer actualHomeGoals, Integer actualAwayGoals) {
        return matchRepository.findById(matchId).map(match -> {
            match.setFinalHomeGoals(actualHomeGoals);
            match.setFinalAwayGoals(actualAwayGoals);
            return matchRepository.save(match);
        });
    }
}