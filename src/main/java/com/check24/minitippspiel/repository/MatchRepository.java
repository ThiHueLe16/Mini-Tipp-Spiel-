package com.check24.minitippspiel.repository;

import com.check24.minitippspiel.model.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface MatchRepository extends JpaRepository<Match, Long> {

    List<Match> findByIsEvaluatedFalse();
}
