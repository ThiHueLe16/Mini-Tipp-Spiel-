package com.check24.minitippspiel.repository;

import com.check24.minitippspiel.model.Prediction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PredictionRepository extends JpaRepository<Prediction, Long> {
    Optional<Prediction> findByUserIdAndMatchId(Long userId, Long matchId);
    List<Prediction> findByUserId(Long userId);
    List<Prediction> findByMatchId(Long matchId);
}
