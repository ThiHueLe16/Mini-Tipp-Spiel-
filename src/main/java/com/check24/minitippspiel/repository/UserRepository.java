package com.check24.minitippspiel.repository;

import com.check24.minitippspiel.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;


@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    // Leaderboard query: orders users by totalPoints descending
    List<User> findAllByOrderByTotalPointsDesc();
}