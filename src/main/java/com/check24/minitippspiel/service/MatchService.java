package com.check24.minitippspiel.service;

import com.check24.minitippspiel.dto.MatchCreateDto;
import com.check24.minitippspiel.dto.MatchScoreDto;
import com.check24.minitippspiel.model.Match;
import com.check24.minitippspiel.model.MatchEvent;
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
    public Optional<Match> updateMatchScore(Long matchId, MatchScoreDto scoreDto) {
        return matchRepository.findById(matchId).map(match -> {
            match.setFinalHomeGoals(scoreDto.finalHomeGoals());
            match.setFinalAwayGoals(scoreDto.finalAwayGoals());

            // Clear existing timeline events and replace with new payload
            match.getEvents().clear();

            if (scoreDto.events() != null && !scoreDto.events().isEmpty()) {
                for (var eventDto : scoreDto.events()) {
                    MatchEvent event = MatchEvent.builder()
                            .match(match)
                            .minute(eventDto.minute())
                            .type(eventDto.type())
                            .team(eventDto.team())
                            .player(eventDto.player())
                            .description(eventDto.description())
                            .build();
                    match.getEvents().add(event);
                }
            }

            return matchRepository.save(match);
        });
    }
}