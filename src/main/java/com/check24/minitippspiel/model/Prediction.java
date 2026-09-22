package com.check24.minitippspiel.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "predictions", uniqueConstraints = {
        // Ensures a user can only make ONE prediction per match
        @UniqueConstraint(columnNames = {"user_id", "match_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Prediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @Column(nullable = false)
    private int predictedHomeGoals;

    @Column(nullable = false)
    private int predictedAwayGoals;

    private Integer pointsEarned;
}